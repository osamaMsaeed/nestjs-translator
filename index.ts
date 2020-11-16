import {
  Inject,
  Injectable,
  Module,
  DynamicModule,
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';

import * as fs from 'fs';
import * as path from 'path';
import * as ReplaceStr from 'replace-string';
import { Response, Request } from 'express';

@Injectable()
export class TranslatorService {
  public readonly _keyExtractor : (req)=>string | undefined;
  constructor(
    @Inject('DEFAULT_TRANSLATION_LANGUAGE') private defaultLanguage: string,
    @Inject('TRANSLATION_SOURCE') private readonly default_source: string,
    @Inject('TRANSLATOR_REQUEST_KEY_EXTRACTOR') private readonly keyExtractor: (req)=>string,
  ) {
    this.findLangs();
    if(keyExtractor)
      this._keyExtractor = keyExtractor;
  }

  private langs: { [lang: string]: object } = {};

  getLangs() : string[] {
    return Object.keys(this.langs);
  }

  private getSourceFolderPath() {
    return path.join(__dirname, '../../', this.default_source);
  }

  /**
   * this method provides translation source and assigns to this.langs property.
   */
  private findLangs() {
    /**
     * Generating a source path for language folders.
     */
    const source = this.getSourceFolderPath();

    /**
     * Fetching a list of folders that are exist in the language source folder.
     */
    const folders = fs.readdirSync(source);

    /**
     * Iterating language folders and extract translation json files.
     */
    folders.forEach((langFolder, i) => {
      try{
        const currentLangFolder = path.join(source, '/', langFolder);

        const files = fs.readdirSync(currentLangFolder);
        files.forEach(langFile => {
          const currentLangFile = path.join(currentLangFolder, langFile);

          try {
            const content = JSON.parse(
              fs.readFileSync(currentLangFile, { encoding: 'utf8' }),
            );

            if (content) {
              this.langs[langFolder] = { ...this.langs[langFolder], ...content };
            }
          } catch (e) {
            throw new Error(
              `Error on reading translation file : ${currentLangFile}\nThe file should be JSON format.`,
            );
          }
        });
      }catch(e){}
    });
  }

  /**
   *
   * @param key
   * @param options
   */
  translate(
    key: string,
    options?: {
      replace?: { [key: string]: string };
      lang?: string;
    },
  ) {
    /**
     * First we have to recognize the language.
     */
    let lang = this.defaultLanguage;
    if (options && options.lang) {
      if (this.langs.hasOwnProperty(options.lang)) {
        lang = options.lang;
      } else {
        throw new Error(
          `Language "${options.lang}" not founded for key : "${key}"`,
        );
      }
    }

    /**
     * Extracting replace keys
     */
    let replaceKeys = [];
    if (options && options.replace && typeof options.replace == 'object') {
      replaceKeys = Object.keys(options.replace);
    }

    let msg = key;
    if (this.langs[lang].hasOwnProperty(key)) {
      msg = this.langs[lang][key];
    }

    /**
     * Replacing every property in the message
     */
    replaceKeys.forEach(key => {
      const value = options.replace[key];
      msg = ReplaceStr(msg, '${' + key + '}', value);
    });

    return msg;
  }
}



/**
 * Translator module provides a service to translate messages (strings).
 * You can create some different languages in the /src/i18n folder and this service will resolve every folder
 * that exists in itself and parse every single json file.
 *
 * NOTICE ::: every time you run your NestJS app, translator service will copy content of /src/i18n to /dist/i18n.
 * Every time you change translation sources (/src/i18n), you have to restart your NestJS app to regenerate
 * translation sources again.
 */

interface TranslatorModuleOptionsInterface {
  defaultLang?: string;
  translationSource?: string;
  global?: boolean;
  requestKeyExtractor? : (req : Request | any)=>string;
}

@Module({})
export class TranslatorModule {
  static forRoot(options: TranslatorModuleOptionsInterface): DynamicModule {
    let global: boolean = false;
    if (options.hasOwnProperty('global')) global = options.global;

    let defaultLang = 'en';
    if (options.hasOwnProperty('defaultLang'))
      defaultLang = options.defaultLang;

    let translationSource = '/src/i18n';
    if (options.hasOwnProperty('translationSource'))
      translationSource = options.translationSource;

    let requestKeyExtractor : any = ()=>defaultLang;
    if(options.hasOwnProperty('requestKeyExtractor'))
      requestKeyExtractor = options.requestKeyExtractor;

    const Module = {
      global,
      module: TranslatorModule,
      providers: [
        {
          provide: 'DEFAULT_TRANSLATION_LANGUAGE',
          useValue: defaultLang
        },
        {
          provide: 'TRANSLATION_SOURCE',
          useValue: translationSource
        },
        {
          provide: 'TRANSLATOR_REQUEST_KEY_EXTRACTOR',
          useValue: requestKeyExtractor
        },
        TranslatorService,
      ],
      exports: [TranslatorService],
    };
    return Module;
  }
}

@Injectable()
export class TranslatorFilter implements ExceptionFilter {
  constructor(private translator: TranslatorService) {}
  catch(exception: HttpException | any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = exception.getStatus();
    let message: string | string[] | any = exception.message;

    try {
      if (exception.response) {
        if (exception.response.message) {
          message = exception.response.message;
        }
        if (exception.respone.statusCode) {
          status = exception.respone.statusCode;
        }
      }
    } catch (e) {}


    /**
     * Trying to extract the language key from the key extractor function.
     */
    let langKey;
    let selectedLanguage;
    if(this.translator._keyExtractor){
      try{
        langKey = this.translator._keyExtractor(req);
      }catch (e) {}
    }
    if(typeof langKey == 'string'){
      const langs : string[] = this.translator.getLangs();
      if(langs.indexOf(langKey) > -1){
        selectedLanguage = langKey;
      }
    }

    const translationOptions = selectedLanguage?{lang : selectedLanguage}:{};
    if (Array.isArray(message)) {
      message = message.map(t => {
        return this.translator.translate(t, translationOptions);
      });
    } else if (typeof message == 'string') {
      message = this.translator.translate(message, translationOptions);
    }

    response.status(status).json({
      statusCode: status,
      message,
    });
  }
}



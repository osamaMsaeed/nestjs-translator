# **NestJS Translator Module**
<img src="https://raw.githubusercontent.com/alireza1998dev/nestjs-translator/master/NestJs-translator.png" width="200" height="200"/>

A simple and lightweight module and exception filter to translate and organize your NestJS app messages (strings).

## **Installation**
**1 - Use the npm package manager to install this module :** 

`npm i nestjs-translator`

**2 - Import the nestjs-translator module in the module that you want to use, like this :** 

app.module.ts
```
import { Module } from '@nestjs/common';
import { TranslatorModule } from 'nestjs-translator';

@Module({
  imports: [
    TranslatorModule.forRoot({
      global: true,
      defaultLang: 'en',
      translationSource : '/src/i18n'
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

>**NOTICE :::** If you define `global` option to `true` then your NestJS app can access the translator module in other modules.

I recommend you to use `global : true`.

**3 - Create your translation source :**

You can create translation sources/strings particularly.

The default path for translation sources is `/src/i18n`.

So we create some translation sources (with JSON format) in our project like this :
```
    Your project
    ├── dist
    ├── src
        └── i18n
            └── en
                ├── common.json
                └── cats.json
            └── fa
                ├── common.json
                └── cats.json
```
In this example `en` is a translation source folder for english language and `fa` is translation source folder for farsi (persian) language.

Let's add some content into our files.

**/src/i18n/en/common.json**
```
{
    "you_are_not_logged_in" : "You are not logged in, please login now!",
    "welcome" : "Welcome to new NestJS app"
}
```

**/src/i18n/fa/common.json**
```
{
    "you_are_not_logged_in" : "شما وارد سیستم نشده اید",
    "welcome" : "خوش آمدید"
}
```

# **Use it !**

There's no more configuration step, you can use the translator as a service in the controller.

```
import { Controller, Get } from '@nestjs/common';
import { TranslatorService } from 'nestjs-translator';

@Controller()
export class AppController {
  constructor(
    private translator: TranslatorService,
  ) {}

  @Get()
  getHello(): string {
    return this.translator.translate('welcome', {
      lang: 'fa',
    });
  }
}

```
Start your NestJS app : 

`npm run start:dev`

See the result :
http://localhost:3000

# Replaceable fields
You can replace parts of the text simply by using `${}` syntax in the translation source.

**/src/i18n/en/common.json**
```
{
    "welcome" : "Welcome to new ${appName} app"
}
```

Specify `replace` in the `translate` method options like this :
```
import { Controller, Get } from '@nestjs/common';
import { TranslatorService } from 'nestjs-translator';

@Controller()
export class AppController {
  constructor(
    private translator: TranslatorService,
  ) {}

  @Get()
  getHello(): string {
    return this.translator.translate('welcome', {
      lang: 'en',
      replace: {
        appName: 'NestJS',
      },
    });
  }
}
```
You should see this as the output :

**Welcome to new NestJS app.**

# **Translator Filter**
`TranslatorFilter` is a nice feature to automate the http exception translation.

Add it into your controller by using `@UseFilters(TranslatorFilter)` decorator: 

```
import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  UseFilters,
} from '@nestjs/common';
import { TranslatorService, TranslatorFilter } from 'nestjs-translator';

@Controller()
@UseFilters(TranslatorFilter)
export class AppController {
  constructor(private translator: TranslatorService) {}

  @Get()
  getHello(): string {
    throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
  }
}
```
Define the key.

**/src/i18n/en/common.json**
```
{
    "Unauthorized" : "You are not logged in, please login now!"
}
```

## Request key extractor
You can have dynamic language for the http exception filter (TranslatorFilter).

We're assuming that you have an attached user on your ExpressJS `Request` object.

Then we can use a function called `requestKeyExtractor` in the module configuration options.

app.module.ts
```
import { Module } from '@nestjs/common';
import { TranslatorModule } from 'nestjs-translator';

@Module({
  imports: [
    TranslatorModule.forRoot({
      global: true,
      defaultLang: 'en',
      requestKeyExtractor: req => { 
        if(req.user){
            return req.user.language
        }
        return null;
      }, 
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

Or maybe using a header to recognise the language : 
```
import { Module } from '@nestjs/common';
import { TranslatorModule } from 'nestjs-translator';

@Module({
  imports: [
    TranslatorModule.forRoot({
      global: true,
      defaultLang: 'en',
      requestKeyExtractor: req => req.get('language'), 
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

# **Github**
Please let me know if you have an idea to make this module better.
[https://github.com/alireza1998dev/nestjs-translator](https://github.com/alireza1998dev/nestjs-translator)

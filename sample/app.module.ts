import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { ResponseModule } from '../lib/modules/response.module.js';
import { ResponseLogInterceptor } from './response-log.interceptor.js';

const nestjsResponseConfig = ResponseModule.forRoot({
    excludedKeys: ['secret']
});

@Module({
    imports: [nestjsResponseConfig],
    providers: [
        {
            provide: APP_INTERCEPTOR,
            useClass: ResponseLogInterceptor
        }
    ],
    controllers: [AppController]
})
export class AppModule {}

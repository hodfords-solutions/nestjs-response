import { DynamicModule, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ResponseInterceptor } from '../interceptors/response.interceptor.js';
import { NESTJS_RESPONSE_CONFIG_OPTIONS } from '../constants/provider-key.constant.js';
import { ConfigOption } from '../types/config-option.type.js';

@Module({})
export class ResponseModule {
    static forRoot(option?: ConfigOption): DynamicModule {
        return {
            module: ResponseModule,
            providers: [
                {
                    provide: NESTJS_RESPONSE_CONFIG_OPTIONS,
                    useValue: option
                },
                {
                    provide: APP_INTERCEPTOR,
                    useClass: ResponseInterceptor
                }
            ],
            exports: []
        };
    }
}

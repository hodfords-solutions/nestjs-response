import { DynamicModule, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ResponseInterceptor } from '../interceptors/response.interceptor';
import { NESTJS_RESPONSE_CONFIG_OPTIONS } from '../constants/provider-key.constant';
import { ConfigOption } from '../types/config-option.type';

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

import { CallHandler, ExecutionContext, Inject, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { isBoolean, validateSync } from 'class-validator';
import { NESTJS_RESPONSE_CONFIG_OPTIONS } from 'libs/constants/provider-key.constant';
import { ConfigOption } from 'libs/types/config-option.type';
import { Observable, map } from 'rxjs';
import { RESPONSE_METADATA_KEY, RESPONSE_METADATA_KEYS } from '../constants/metadata.constant';
import { ResponseValidateException } from '../exceptions/response-validate.exception';
import { NativeValueResponse } from '../responses/native-value.response';
import { HandleResult } from '../types/handle-result.type';
import { ResponseMetadata } from '../types/response-metadata.type';
import { NativeClassResponseNamesConstant } from './../constants/native-class-response-names.constant';
import { ModuleRef } from '@nestjs/core';

let Metadata = null;

try {
    // Check project is using grpc
    // eslint-disable-next-line
    const grpc = require('@grpc/grpc-js');
    Metadata = grpc.Metadata;
} catch (ex) {}

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
    private readonly logger = new Logger(ResponseInterceptor.name);
    private configOption: ConfigOption;

    constructor(private moduleRef: ModuleRef) {
        this.configOption = this.moduleRef.get(NESTJS_RESPONSE_CONFIG_OPTIONS, { strict: false });
    }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        return next.handle().pipe(
            map((data) => {
                const res = this.handleResponse(context, data);

                return this.excludeByKeys(res, this.configOption?.excludedKeys || []);
            })
        );
    }

    handleResponse(context: ExecutionContext, data: any) {
        const responseMetadata: ResponseMetadata = Reflect.getMetadata(RESPONSE_METADATA_KEY, context.getHandler());
        const responseMetadatas: ResponseMetadata[] = Reflect.getMetadata(RESPONSE_METADATA_KEYS, context.getHandler());
        if (responseMetadata) {
            return this.handleMultiTypeResponse(context, data, [responseMetadata]);
        }
        if (responseMetadatas && responseMetadatas.length > 0) {
            return this.handleMultiTypeResponse(context, data, responseMetadatas);
        }
        return data;
    }

    private excludeByKeys(data: any, keys: string[]) {
        for (const key of keys) {
            data = this.excludeByKey(data, key);
        }

        return data;
    }

    private excludeByKey(data: any, key: string) {
        for (const prop in data) {
            if (typeof data[prop] === 'object') {
                data[prop] = this.excludeByKey(data[prop], key);
            } else if (Array.isArray(data[prop])) {
                data[prop] = data[prop].map((item: any) => this.excludeByKey(item, key));
            } else if (prop === key) {
                delete data[prop];
            }
        }

        return data;
    }

    private handleOneTypeResponse(context: ExecutionContext, data: any, responseMetadata: ResponseMetadata) {
        if (!isBoolean(data) && !data) {
            return this.handleEmptyResponse(responseMetadata, data);
        }
        if (responseMetadata.isArray) {
            return this.handleListResponse(context, responseMetadata, data);
        }

        return this.handleSingleResponse(responseMetadata, data);
    }

    private handleMultiTypeResponse(context: ExecutionContext, data: any, responseMetadatas: ResponseMetadata[]) {
        const results: HandleResult[] = [];
        const newMetadatas = this.filterResponseMetadatas(responseMetadatas, data);
        for (const metadata of newMetadatas) {
            try {
                const result = this.handleOneTypeResponse(context, data, metadata);
                results.push({ data: result, error: null });
            } catch (error) {
                const newError = error.errors ? error.errors : error;
                results.push({ data: null, error: newError });
            }
        }
        const resultValid = results.find((result) => result.error === null);
        if (resultValid) {
            return resultValid.data;
        }
        const errors = results.map((result) => result.error);
        this.logger.error(errors);
        throw new ResponseValidateException(errors);
    }

    private handleSingleResponse(responseMetadata: ResponseMetadata, data: any) {
        if (NativeClassResponseNamesConstant.includes(responseMetadata.responseClass.name)) {
            return this.handleNativeValueResponse(responseMetadata, data);
        }

        const newData = plainToInstance(responseMetadata.responseClass, data);
        const errors = validateSync(newData, {
            whitelist: true,
            stopAtFirstError: true
        });
        if (errors.length) {
            throw new ResponseValidateException(errors);
        }
        return plainToInstance(responseMetadata.responseClass, data);
    }

    private handleListResponse(context: ExecutionContext, responseMetadata: ResponseMetadata, data: any) {
        const newData: object[] = [];
        for (const item of data) {
            const newItem = this.handleSingleResponse(responseMetadata, item);
            newData.push(newItem);
        }
        if (Metadata && context.switchToRpc().getContext() instanceof Metadata) {
            return { items: newData, grpcArray: true };
        }
        return newData;
    }

    private handleEmptyResponse(responseMetadata: ResponseMetadata, data: any) {
        if (responseMetadata.isAllowEmpty) {
            return data;
        } else {
            throw new ResponseValidateException([
                {
                    target: data,
                    children: [],
                    constraints: {
                        nullValue: 'an null value was passed to the validate function'
                    }
                }
            ]);
        }
    }

    private handleNativeValueResponse(responseMetadata: ResponseMetadata, data: any): any {
        const responseMap = this.getResponseMap(responseMetadata, data);
        const newData = plainToInstance(NativeValueResponse, responseMap);
        const errors = validateSync(newData, {
            whitelist: true,
            stopAtFirstError: true
        });
        if (errors.length) {
            throw new ResponseValidateException(errors);
        }
        return data;
    }

    private getResponseMap(responseMetadata: ResponseMetadata, data: any): Record<string, any> {
        switch (responseMetadata.responseClass.name) {
            case 'Boolean':
                return { ['boolean']: data };
            case 'String':
                return { ['string']: data };
            case 'Number':
                return { ['number']: data };
            default:
                return {};
        }
    }

    private filterResponseMetadatas(responseMetadatas: ResponseMetadata[], data: any): ResponseMetadata[] {
        if (Array.isArray(data)) {
            return this.getArrayTypeMetadata(responseMetadatas, data);
        }
        if (!isBoolean(data) && !data) {
            return this.getEmptyTypeMetadata(responseMetadatas, data);
        }
        return this.getObjectTypeMetadata(responseMetadatas, data);
    }

    private getArrayTypeMetadata(responseMetadatas: ResponseMetadata[], data: any) {
        const arrayTypes = responseMetadatas.filter((metadata) => metadata.isArray);
        if (arrayTypes.length == 0) {
            throw new ResponseValidateException([
                {
                    target: data,
                    children: [],
                    constraints: {
                        arrayValue: 'an array value was passed to the validate function'
                    }
                }
            ]);
        }
        return arrayTypes;
    }

    private getEmptyTypeMetadata(responseMetadatas: ResponseMetadata[], data: any) {
        const emptyType = responseMetadatas.find((metadata) => metadata.isAllowEmpty);
        if (emptyType) {
            return [emptyType];
        }
        throw new ResponseValidateException([
            {
                target: data,
                children: [],
                constraints: {
                    arrayValue: 'an empty value was passed to the validate function'
                }
            }
        ]);
    }

    private getObjectTypeMetadata(responseMetadatas: ResponseMetadata[], data: any) {
        const objectTypes = responseMetadatas.filter((metadata) => !metadata.isArray);
        if (objectTypes.length == 0) {
            throw new ResponseValidateException([
                {
                    target: data,
                    children: [],
                    constraints: {
                        arrayValue: 'an object value was passed to the validate function'
                    }
                }
            ]);
        }
        return objectTypes;
    }
}

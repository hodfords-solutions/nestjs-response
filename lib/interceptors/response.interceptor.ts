import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { isBoolean, validateSync } from 'class-validator';
import { NESTJS_RESPONSE_CONFIG_OPTIONS } from 'lib/constants/provider-key.constant';
import { ConfigOption } from 'lib/types/config-option.type';
import { Observable, map } from 'rxjs';
import { RESPONSE_METADATA_KEY, RESPONSE_METADATA_KEYS } from '../constants/metadata.constant';
import { ResponseValidateException } from '../exceptions/response-validate.exception';
import { NativeValueResponse } from '../responses/native-value.response';
import { HandleResult } from '../types/handle-result.type';
import { ResponseMetadata } from '../types/response-metadata.type';
import { NativeClassResponseNamesConstant } from '../constants/native-class-response-names.constant';
import { ModuleRef } from '@nestjs/core';

let grpcMetadataClass = null;

try {
    // Check project is using grpc
    // eslint-disable-next-line
    const grpc = require('@grpc/grpc-js');
    grpcMetadataClass = grpc.Metadata;
} catch (ex) {
    console.log(ex?.message);
}

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
    private readonly logger = new Logger(ResponseInterceptor.name);
    private configOption: ConfigOption;

    constructor(private moduleRef: ModuleRef) {
        this.configOption = this.moduleRef.get(NESTJS_RESPONSE_CONFIG_OPTIONS, { strict: false });
    }

    intercept(context: ExecutionContext, next: CallHandler): Observable<object> {
        return next.handle().pipe(
            map((data) => {
                const res = this.handleResponse(context, data);

                return this.excludeByKeys(context, res, this.configOption?.excludedKeys || []);
            })
        );
    }

    handleResponse(context: ExecutionContext, data: object): object {
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

    private excludeByKeys(context: ExecutionContext, data: object, keys: string[]): object {
        /**
         * Check if endpoint has response metadata, if not, then return data
         */
        if (
            !Reflect.getMetadata(RESPONSE_METADATA_KEY, context.getHandler()) &&
            !Reflect.getMetadata(RESPONSE_METADATA_KEYS, context.getHandler())
        ) {
            return data;
        }

        for (const key of keys) {
            data = this.excludeByKey(data, key);
        }

        return data;
    }

    private excludeByKey(data: object | object[], key: string): object {
        for (const prop in data) {
            if (typeof data[prop] === 'object') {
                data[prop] = this.excludeByKey(data[prop], key);
            } else if (Array.isArray(data[prop])) {
                data[prop] = data[prop].map((item: object) => this.excludeByKey(item, key));
            } else if (prop === key) {
                delete data[prop];
            }
        }

        return data;
    }

    private handleOneTypeResponse(
        context: ExecutionContext,
        data: object | object[],
        responseMetadata: ResponseMetadata
    ): object {
        if (!isBoolean(data) && !data) {
            return this.handleEmptyResponse(responseMetadata, data);
        }
        if (responseMetadata.isArray) {
            return this.handleListResponse(context, responseMetadata, data as object[]);
        }

        return this.handleSingleResponse(responseMetadata, data);
    }

    private handleMultiTypeResponse(
        context: ExecutionContext,
        data: object,
        responseMetadatas: ResponseMetadata[]
    ): object {
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

    private handleSingleResponse(responseMetadata: ResponseMetadata, data: object): object {
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

    private handleListResponse(
        context: ExecutionContext,
        responseMetadata: ResponseMetadata,
        data: object[]
    ): object[] | { items: object[]; grpcArray: boolean } {
        const newData: object[] = [];
        for (const item of data) {
            const newItem = this.handleSingleResponse(responseMetadata, item);
            newData.push(newItem);
        }
        if (grpcMetadataClass && context.switchToRpc().getContext() instanceof grpcMetadataClass) {
            return { items: newData, grpcArray: true };
        }
        return newData;
    }

    private handleEmptyResponse(responseMetadata: ResponseMetadata, data: object): object {
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

    private handleNativeValueResponse(responseMetadata: ResponseMetadata, data: object): object {
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

    private getResponseMap(responseMetadata: ResponseMetadata, data: object): Record<string, object> {
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

    private filterResponseMetadatas(responseMetadatas: ResponseMetadata[], data: object): ResponseMetadata[] {
        if (Array.isArray(data)) {
            return this.getArrayTypeMetadata(responseMetadatas, data);
        }
        if (!isBoolean(data) && !data) {
            return this.getEmptyTypeMetadata(responseMetadatas, data);
        }
        return this.getObjectTypeMetadata(responseMetadatas, data);
    }

    private getArrayTypeMetadata(responseMetadatas: ResponseMetadata[], data: object): ResponseMetadata[] {
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

    private getEmptyTypeMetadata(responseMetadatas: ResponseMetadata[], data: object): ResponseMetadata[] {
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

    private getObjectTypeMetadata(responseMetadatas: ResponseMetadata[], data: object): ResponseMetadata[] {
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

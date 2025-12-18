/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import { ClassConstructor } from 'class-transformer';

export type ResponseMetadata = {
    responseClass: ClassConstructor<object>;
    isArray: boolean;
    isAllowEmpty: boolean;
    isGrpcNullable: boolean;
};

export type ResponseClass = Function | [Function];

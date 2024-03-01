/* eslint-disable @typescript-eslint/ban-types */
import { ClassConstructor } from 'class-transformer';

export type ResponseMetadata = {
    responseClass: ClassConstructor<object>;
    isArray: boolean;
    isAllowEmpty: boolean;
};

export type ResponseClass = Function | [Function];

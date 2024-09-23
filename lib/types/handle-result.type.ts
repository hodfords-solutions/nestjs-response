import { ValidationError } from 'class-validator';

export type HandleResult = {
    error: ValidationError;
    data: object | object[];
};

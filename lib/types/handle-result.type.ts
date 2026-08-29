import { ValidationError } from 'class-validator';

/** A validation failure, or the nested failures produced by a multi-type response. */
export type HandleError = Partial<ValidationError> | ValidationError[];

export type HandleResult = {
    error: HandleError | null;
    data: object | object[] | null;
};

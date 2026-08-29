import { HttpException, HttpStatus } from '@nestjs/common';
import { HandleError } from '../types/handle-result.type.js';

export class ResponseValidateException extends HttpException {
    constructor(public errors: (HandleError | null)[]) {
        super({}, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}

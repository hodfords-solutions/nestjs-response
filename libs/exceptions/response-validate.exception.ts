import { HttpException, HttpStatus } from '@nestjs/common';

export class ResponseValidateException extends HttpException {
    constructor(public errors) {
        super({}, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ResponseValidateException } from '../exceptions/response-validate.exception';
import { RESPONSE_METADATA_KEY } from '../constants/metadata.constant';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        return next.handle().pipe(map((data) => this.handleResponse(context, data)));
    }

    async handleResponse(context: ExecutionContext, data) {
        let responseMetadata = Reflect.getMetadata(RESPONSE_METADATA_KEY, context.getHandler());
        if (!responseMetadata) {
            return data;
        }
        if (responseMetadata.isArray) {
            let newData = [];
            for (let item of data) {
                let newItem = plainToInstance(responseMetadata.responseClass, item);
                let errors = await validate(newItem, {
                    whitelist: true,
                    stopAtFirstError: true
                });
                if (errors.length) {
                    console.error(errors);
                    throw new ResponseValidateException(errors);
                }
                newData.push(newItem);
            }
            return newData;
        }
        let newData = plainToInstance(responseMetadata.responseClass, data);
        let errors = await validate(newData, {
            whitelist: true,
            stopAtFirstError: true
        });
        if (errors.length) {
            console.error(errors);
            throw new ResponseValidateException(errors);
        }
        return newData;
    }
}

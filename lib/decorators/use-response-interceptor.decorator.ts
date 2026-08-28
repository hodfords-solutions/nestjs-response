import { UseInterceptors } from '@nestjs/common';
import { ResponseInterceptor } from '../interceptors/response.interceptor.js';

export function UseResponseInterceptor(): MethodDecorator & ClassDecorator {
    return UseInterceptors(ResponseInterceptor);
}

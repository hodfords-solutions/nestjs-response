import { UseInterceptors } from '@nestjs/common';
import { ResponseInterceptor } from '../interceptors/response.interceptor';

export function UseResponseInterceptor(): MethodDecorator & ClassDecorator {
    return UseInterceptors(ResponseInterceptor);
}

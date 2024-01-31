import { UseInterceptors } from '@nestjs/common';
import { ResponseInterceptor } from '../interceptors/response.interceptor';

export function UseResponseInterceptor() {
    return UseInterceptors(ResponseInterceptor);
}

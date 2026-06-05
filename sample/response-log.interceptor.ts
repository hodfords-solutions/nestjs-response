import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, catchError, tap, throwError } from 'rxjs';

@Injectable()
export class ResponseLogInterceptor implements NestInterceptor {
    private readonly logger = new Logger('Response');

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const request = context.switchToHttp().getRequest();
        const { method, url } = request;
        const start = Date.now();

        return next.handle().pipe(
            tap((response) => {
                const elapsed = Date.now() - start;
                this.logger.log(`${method} ${url} ${elapsed}ms ${JSON.stringify(response)}`);
            }),
            catchError((error) => {
                const elapsed = Date.now() - start;
                const status = error?.getStatus?.() ?? 500;
                const detail = error?.errors ?? error?.response ?? error?.message;
                this.logger.error(`${method} ${url} ${elapsed}ms ${status} ${JSON.stringify(detail)}`);
                return throwError(() => error);
            })
        );
    }
}

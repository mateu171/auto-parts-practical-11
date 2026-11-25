
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';

@Injectable()
export class ResponseTimeInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const startTime = Date.now();

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    return next.handle().pipe(
      tap(() => {
        // SSE-потік надсилає заголовки з першою подією — після цього їх змінювати не можна
        if (response.headersSent) {
          return;
        }

        const duration = Date.now() - startTime;

        response.setHeader('X-Response-Time', `${duration}ms`);
      }),
    );
  }
}

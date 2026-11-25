import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseTimeInterceptor } from './common/interceptors/response-time.interceptor';
import { TrimPipe } from './common/pipes/trim.pipe';

/**
 * Спільне налаштування конвеєра запиту (pipes, filters, interceptors).
 * Використовується і в main.ts, і в E2E-тестах — тому тести перевіряють
 * саме ту конфігурацію, яка працює у виробничому застосунку.
 */
export function setupApp(app: INestApplication): void {
  app.use(cookieParser());

  app.useGlobalPipes(
    new TrimPipe(),
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseTimeInterceptor());
}

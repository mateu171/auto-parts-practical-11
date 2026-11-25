import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export const SWAGGER_PATH = 'api/docs';

/**
 * Генерація OpenAPI 3.0 документації.
 *  - Swagger UI:      GET /api/docs
 *  - OpenAPI (JSON):  GET /api/docs-json
 */
export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Автозапчастини та вузли — API')
    .setDescription(
      'Офіційна технічна документація REST API інтернет-магазину автозапчастин ' +
        '(варіант 7): каталог запчастин, JWT-авторизація, сповіщення в реальному часі.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup(SWAGGER_PATH, app, document, {
    // токен залишається в Swagger UI після оновлення сторінки
    swaggerOptions: { persistAuthorization: true },
  });
}

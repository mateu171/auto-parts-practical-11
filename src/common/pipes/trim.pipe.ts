import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class TrimPipe implements PipeTransform {
  transform(value: unknown, metadata?: ArgumentMetadata): unknown {
    // Обробляємо лише HTTP-дані; сокети та інші кастомні аргументи не чіпаємо
    if (metadata && !['body', 'query', 'param'].includes(metadata.type)) {
      return value;
    }

    return this.trim(value);
  }

  private trim(value: unknown): unknown {
    if (typeof value === 'string') {
      return value.trim();
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.trim(item));
    }

    // Рекурсія лише для простих об'єктів (JSON), не для екземплярів класів
    if (value !== null && typeof value === 'object') {
      const proto = Object.getPrototypeOf(value);

      if (proto === Object.prototype || proto === null) {
        return Object.fromEntries(
          Object.entries(value).map(([key, item]) => [key, this.trim(item)]),
        );
      }
    }

    return value;
  }
}
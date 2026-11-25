import { ArgumentMetadata } from '@nestjs/common';
import { TrimPipe } from './trim.pipe';

describe('TrimPipe', () => {
  const pipe = new TrimPipe();
  const body: ArgumentMetadata = { type: 'body' };

  it('обрізає пробіли у рядках, вкладених об’єктах і масивах', () => {
    const result = pipe.transform(
      { title: '  Фільтр  ', nested: { a: ' x ' }, list: [' 1 ', ' 2'] },
      body,
    );

    expect(result).toEqual({ title: 'Фільтр', nested: { a: 'x' }, list: ['1', '2'] });
  });

  it('не змінює значення типу custom (наприклад, WebSocket)', () => {
    const value = '  raw  ';

    expect(pipe.transform(value, { type: 'custom' })).toBe(value);
  });

  it('залишає числа та null без змін', () => {
    expect(pipe.transform(5, body)).toBe(5);
    expect(pipe.transform(null, body)).toBeNull();
  });
});

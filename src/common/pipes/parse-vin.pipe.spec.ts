import { BadRequestException } from '@nestjs/common';
import { ParseVinPipe } from './parse-vin.pipe';

describe('ParseVinPipe', () => {
  const pipe = new ParseVinPipe();

  it('нормалізує валідний VIN до верхнього регістру', () => {
    expect(pipe.transform(' wvwzzz1jzxw000001 ')).toBe('WVWZZZ1JZXW000001');
  });

  it.each([
    ['занадто короткий', 'ABC123'],
    ['містить літеру I', 'WVWZZZ1JZXW00000I'],
    ['містить літеру O', 'WVWZZZ1JZXW00000O'],
    ['містить літеру Q', 'WVWZZZ1JZXW00000Q'],
    ['містить недозволений символ', 'WVWZZZ1JZXW00000-'],
  ])('відхиляє VIN, який %s', (_label, vin) => {
    expect(() => pipe.transform(vin)).toThrow(BadRequestException);
  });
});

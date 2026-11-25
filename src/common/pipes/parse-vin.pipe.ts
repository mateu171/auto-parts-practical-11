import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;

@Injectable()
export class ParseVinPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    const vin = String(value).trim().toUpperCase();

    if (!VIN_PATTERN.test(vin)) {
      throw new BadRequestException(
        'VIN-код має містити 17 символів (A-Z, 0-9, без I, O, Q)',
      );
    }

    return vin;
  }
}

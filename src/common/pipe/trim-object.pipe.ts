import { Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class TrimObjectPipe implements PipeTransform {
  transform(value: any) {
    if (typeof value !== 'object' || value === null) {
      return value;
    }

    const trimmedObject = {};

    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        const trimmedKey = key.trim(); // Trim whitespace from keys
        const trimmedValue = typeof value[key] === 'string' 
          ? value[key].trim() 
          : value[key];
        
        trimmedObject[trimmedKey] = trimmedValue;
      }
    }

    return trimmedObject;
  }
}

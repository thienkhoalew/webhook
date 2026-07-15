import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getServiceInfo() {
    return { service: 'api-service' };
  }
}

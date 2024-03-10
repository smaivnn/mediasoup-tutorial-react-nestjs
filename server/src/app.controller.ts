import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('room-status')
  getRoomStatus(): Record<string, string[]> {
    return this.appService.getRoomStatus();
  }
}

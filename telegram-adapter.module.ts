import { Module } from '@nestjs/common';
import { TelegramAdapterService } from './telegram-adapter.service';
import { ConfigurationModule } from '../../configuration/configuration.module';

@Module({
  imports: [ConfigurationModule],
  providers: [TelegramAdapterService],
  exports: [TelegramAdapterService],
})
export class TelegramAdapterModule {} 
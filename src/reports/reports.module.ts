import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../products/entities/product.entity';
import { REPORTS_QUEUE_NAME } from './constants/reports-queue.constants';
import { Report } from './entities/report.entity';
import { ReportsProcessor } from './processors/reports.processor';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Report, Product]),
    BullModule.registerQueue({
      name: REPORTS_QUEUE_NAME,
    }),
  ],
  controllers: [ReportsController],
  providers: [ReportsService, ReportsProcessor],
})
export class ReportsModule {}

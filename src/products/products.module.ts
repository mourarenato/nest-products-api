import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { ProductsProcessor } from './processors/products.processor';
import { ProductsController } from './products.controller';
import { PRODUCTS_QUEUE_NAME } from './constants/products-queue.constants';
import { ProductsService } from './products.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product]),
    BullModule.registerQueue({
      name: PRODUCTS_QUEUE_NAME,
    }),
  ],
  controllers: [ProductsController],
  providers: [ProductsService, ProductsProcessor],
})
export class ProductsModule {}

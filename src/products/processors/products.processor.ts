import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { CreateProductDto } from '../dto/create-product.dto';
import {
  PRODUCT_BULK_CREATE_JOB,
  PRODUCTS_QUEUE_NAME,
} from '../constants/products-queue.constants';
import { ProductsService } from '../products.service';

@Processor(PRODUCTS_QUEUE_NAME)
export class ProductsProcessor extends WorkerHost {
  private readonly logger = new Logger(ProductsProcessor.name);

  constructor(private readonly productsService: ProductsService) {
    super();
  }

  async process(job: Job<CreateProductDto>): Promise<void> {
    if (job.name !== PRODUCT_BULK_CREATE_JOB) {
      this.logger.warn(`Skipping unsupported job type: ${job.name}`);
      return;
    }

    await this.productsService.create(job.data);
    this.logger.log(`Processed bulk product job ${job.id} for "${job.data.name}"`);
  }
}

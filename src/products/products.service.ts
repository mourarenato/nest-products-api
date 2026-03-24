import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import {
  PRODUCT_BULK_CREATE_JOB,
  PRODUCTS_QUEUE_NAME,
} from './constants/products-queue.constants';
import { BulkCreateProductItemDto } from './dto/bulk-create-products.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectQueue(PRODUCTS_QUEUE_NAME)
    private readonly productsQueue: Queue,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const product = this.productsRepository.create(createProductDto);
    return this.productsRepository.save(product);
  }

  async findAll(page = 1, limit = 10): Promise<Product[]> {
    const safePage = Number.isNaN(page) || page < 1 ? 1 : page;
    const safeLimit = Number.isNaN(limit) || limit < 1 ? 10 : Math.min(limit, 100);

    return this.productsRepository.find({
      order: { name: 'ASC' },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    });
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productsRepository.findOne({ where: { id } });

    if (!product) {
      throw new NotFoundException(`Product with id "${id}" not found`);
    }

    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);
    Object.assign(product, updateProductDto);
    return this.productsRepository.save(product);
  }

  async remove(id: string): Promise<void> {
    const product = await this.findOne(id);
    await this.productsRepository.remove(product);
  }

  async enqueueBulkCreate(items: BulkCreateProductItemDto[]): Promise<string[]> {
    const jobs = await Promise.all(
      items.map((item) =>
        this.productsQueue.add(PRODUCT_BULK_CREATE_JOB, item, {
          removeOnComplete: 1000,
          removeOnFail: 1000,
        }),
      ),
    );

    return jobs.map((job) => String(job.id));
  }
}

import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { PRODUCT_BULK_CREATE_JOB, PRODUCTS_QUEUE_NAME } from '../../../src/products/constants/products-queue.constants';
import { Product } from '../../../src/products/entities/product.entity';
import { ProductsService } from '../../../src/products/products.service';

type MockRepository<T extends object = object> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const createRepositoryMock = (): MockRepository<Product> => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  remove: jest.fn(),
});

describe('ProductsService', () => {
  let service: ProductsService;
  let repository: MockRepository<Product>;
  let queue: jest.Mocked<Queue>;

  beforeEach(async () => {
    repository = createRepositoryMock();
    queue = {
      add: jest.fn(),
    } as unknown as jest.Mocked<Queue>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: getRepositoryToken(Product),
          useValue: repository,
        },
        {
          provide: getQueueToken(PRODUCTS_QUEUE_NAME),
          useValue: queue,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  it('creates a product', async () => {
    const dto = { name: 'Mouse', description: 'Wireless', price: 50 };
    const entity = { id: '1', ...dto };

    repository.create!.mockReturnValue(entity);
    repository.save!.mockResolvedValue(entity);

    await expect(service.create(dto)).resolves.toEqual(entity);
    expect(repository.create).toHaveBeenCalledWith(dto);
    expect(repository.save).toHaveBeenCalledWith(entity);
  });

  it('finds paginated products', async () => {
    const rows = [{ id: '1', name: 'A', price: 10 }];
    repository.find!.mockResolvedValue(rows);

    await expect(service.findAll(2, 5)).resolves.toEqual(rows);
    expect(repository.find).toHaveBeenCalledWith({
      order: { name: 'ASC' },
      skip: 5,
      take: 5,
    });
  });

  it('finds one product by id', async () => {
    const product = { id: 'abc', name: 'Keyboard', price: 99 };
    repository.findOne!.mockResolvedValue(product);

    await expect(service.findOne('abc')).resolves.toEqual(product);
  });

  it('throws not found when product does not exist', async () => {
    repository.findOne!.mockResolvedValue(null);

    await expect(service.findOne('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates a product', async () => {
    const existing = { id: 'id-1', name: 'Old', price: 5 };
    const updated = { id: 'id-1', name: 'New', price: 10 };

    repository.findOne!.mockResolvedValue(existing);
    repository.save!.mockResolvedValue(updated);

    await expect(service.update('id-1', { name: 'New', price: 10 })).resolves.toEqual(updated);
    expect(repository.save).toHaveBeenCalledWith({ id: 'id-1', name: 'New', price: 10 });
  });

  it('removes a product', async () => {
    const product = { id: 'id-1', name: 'Item', price: 1 };
    repository.findOne!.mockResolvedValue(product);
    repository.remove!.mockResolvedValue(product);

    await expect(service.remove('id-1')).resolves.toBeUndefined();
    expect(repository.remove).toHaveBeenCalledWith(product);
  });

  it('enqueues bulk create jobs', async () => {
    queue.add
      .mockResolvedValueOnce({ id: 'job-1' } as never)
      .mockResolvedValueOnce({ id: 'job-2' } as never);

    await expect(
      service.enqueueBulkCreate([
        { name: 'P1', description: 'A', price: 1 },
        { name: 'P2', description: 'B', price: 2 },
      ]),
    ).resolves.toEqual(['job-1', 'job-2']);

    expect(queue.add).toHaveBeenNthCalledWith(
      1,
      PRODUCT_BULK_CREATE_JOB,
      { name: 'P1', description: 'A', price: 1 },
      { removeOnComplete: 1000, removeOnFail: 1000 },
    );
    expect(queue.add).toHaveBeenNthCalledWith(
      2,
      PRODUCT_BULK_CREATE_JOB,
      { name: 'P2', description: 'B', price: 2 },
      { removeOnComplete: 1000, removeOnFail: 1000 },
    );
  });
});

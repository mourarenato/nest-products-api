import { Test, TestingModule } from '@nestjs/testing';
import { BulkCreateProductsDto } from '../../../src/products/dto/bulk-create-products.dto';
import { CreateProductDto } from '../../../src/products/dto/create-product.dto';
import { UpdateProductDto } from '../../../src/products/dto/update-product.dto';
import { ProductsController } from '../../../src/products/products.controller';
import { ProductsService } from '../../../src/products/products.service';

describe('ProductsController', () => {
  let controller: ProductsController;
  let service: jest.Mocked<ProductsService>;

  beforeEach(async () => {
    const productsServiceMock: Partial<jest.Mocked<ProductsService>> = {
      findAll: jest.fn(),
      create: jest.fn(),
      enqueueBulkCreate: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: productsServiceMock,
        },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
    service = module.get(ProductsService);
  });

  it('calls findAll with page and limit', async () => {
    const rows = [{ id: '1', name: 'Item', price: 10 }];
    service.findAll.mockResolvedValue(rows as never);

    await expect(controller.findAll('2', '3')).resolves.toEqual(rows);
    expect(service.findAll).toHaveBeenCalledWith(2, 3);
  });

  it('creates a product', async () => {
    const dto: CreateProductDto = { name: 'Mouse', description: 'Wireless', price: 99 };
    const created = { id: '1', ...dto };
    service.create.mockResolvedValue(created as never);

    await expect(controller.create(dto)).resolves.toEqual(created);
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('finds one product', async () => {
    const row = { id: 'x', name: 'Keyboard', price: 120 };
    service.findOne.mockResolvedValue(row as never);

    await expect(controller.findOne('x')).resolves.toEqual(row);
    expect(service.findOne).toHaveBeenCalledWith('x');
  });

  it('enqueues products for bulk create', async () => {
    const dto: BulkCreateProductsDto = {
      items: [
        { name: 'A', description: 'Desc A', price: 10 },
        { name: 'B', description: 'Desc B', price: 20 },
      ],
    };
    service.enqueueBulkCreate.mockResolvedValue(['job-1', 'job-2'] as never);

    await expect(controller.bulkCreate(dto)).resolves.toEqual({
      queued: 2,
      jobIds: ['job-1', 'job-2'],
    });
    expect(service.enqueueBulkCreate).toHaveBeenCalledWith(dto.items);
  });

  it('updates a product', async () => {
    const dto: UpdateProductDto = { name: 'Updated', price: 10 };
    const row = { id: 'x', name: 'Updated', price: 10 };
    service.update.mockResolvedValue(row as never);

    await expect(controller.update('x', dto)).resolves.toEqual(row);
    expect(service.update).toHaveBeenCalledWith('x', dto);
  });

  it('removes a product', async () => {
    service.remove.mockResolvedValue(undefined as never);

    await expect(controller.remove('x')).resolves.toBeUndefined();
    expect(service.remove).toHaveBeenCalledWith('x');
  });
});

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module';
import { Product } from '../products/entities/product.entity';
import { UserRole } from '../users/enums/user-role.enum';
import { User } from '../users/entities/user.entity';

type SeedUser = {
  email: string;
  password: string;
  role: UserRole;
};

type SeedProduct = {
  name: string;
  description?: string;
  price: number;
};

const seedUsers: SeedUser[] = [
  {
    email: 'admin@example.com',
    password: 'admin123',
    role: UserRole.ADMIN,
  },
  {
    email: 'professional@example.com',
    password: 'professional123',
    role: UserRole.PROFESSIONAL,
  },
];

const seedProducts: SeedProduct[] = [
  {
    name: 'Wireless Mouse',
    description: 'Ergonomic 2.4GHz wireless mouse',
    price: 29.9,
  },
  {
    name: 'Mechanical Keyboard',
    description: 'RGB backlit mechanical keyboard',
    price: 89.5,
  },
  {
    name: '27-inch Monitor',
    description: 'Full HD monitor with IPS panel',
    price: 219.99,
  },
  {
    name: 'USB-C Dock',
    description: 'Multiport USB-C docking station',
    price: 74.25,
  },
];

async function seed(): Promise<void> {
  const logger = new Logger('DatabaseSeed');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const dataSource = app.get(DataSource);
    const usersRepository = dataSource.getRepository(User);
    const productsRepository = dataSource.getRepository(Product);

    logger.log('Starting database seed...');

    for (const userSeed of seedUsers) {
      const normalizedEmail = userSeed.email.toLowerCase();
      const existingUser = await usersRepository.findOne({
        where: { email: normalizedEmail },
      });

      const passwordHash = await bcrypt.hash(userSeed.password, 10);

      if (!existingUser) {
        const user = usersRepository.create({
          email: normalizedEmail,
          passwordHash,
          role: userSeed.role,
        });
        await usersRepository.save(user);
        logger.log(`Created user: ${normalizedEmail} (${userSeed.role})`);
      } else {
        existingUser.passwordHash = passwordHash;
        existingUser.role = userSeed.role;
        await usersRepository.save(existingUser);
        logger.log(`Updated user: ${normalizedEmail} (${userSeed.role})`);
      }
    }

    for (const productSeed of seedProducts) {
      const existingProduct = await productsRepository.findOne({
        where: { name: productSeed.name },
      });

      if (!existingProduct) {
        const product = productsRepository.create(productSeed);
        await productsRepository.save(product);
        logger.log(`Created product: ${productSeed.name}`);
      } else {
        existingProduct.description = productSeed.description;
        existingProduct.price = productSeed.price;
        await productsRepository.save(existingProduct);
        logger.log(`Updated product: ${productSeed.name}`);
      }
    }

    logger.log('Database seed finished successfully.');
  } catch (error) {
    logger.error('Database seed failed', error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void seed();

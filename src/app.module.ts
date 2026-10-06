import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import expressBasicAuth from 'express-basic-auth';
import { AiModule } from './ai/ai.module';
import { AI_PRODUCT_ENRICHMENT_QUEUE } from './ai/ai.service';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PRODUCTS_QUEUE_NAME } from './products/constants/products-queue.constants';
import { ProductsModule } from './products/products.module';
import { REPORTS_QUEUE_NAME } from './reports/constants/reports-queue.constants';
import { ReportsModule } from './reports/reports.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: Number(configService.get<string>('DB_PORT', '5432')),
        username: configService.get<string>('DB_USERNAME', 'postgres'),
        password: configService.get<string>('DB_PASSWORD', 'postgres'),
        database: configService.get<string>('DB_NAME', 'products_db'),
        autoLoadEntities: true,
        synchronize:
          configService.get<string>('DB_SYNCHRONIZE', 'true') === 'true',
      }),
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', '127.0.0.1'),
          port: Number(configService.get<string>('REDIS_PORT', '6379')),
          password: configService.get<string>('REDIS_PASSWORD') || undefined,
        },
      }),
    }),
    UsersModule,
    AuthModule,
    ProductsModule,
    ReportsModule,
    AiModule,
    BullBoardModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const user = configService.get<string>('BULL_BOARD_USER', 'admin');
        const password = configService.get<string>(
          'BULL_BOARD_PASSWORD',
          'admin',
        );

        return {
          route: '/admin/queues',
          adapter: ExpressAdapter,
          middleware: expressBasicAuth({
            challenge: true,
            users: {
              [user]: password,
            },
          }),
        };
      },
    }),
    BullBoardModule.forFeature(
      { name: PRODUCTS_QUEUE_NAME, adapter: BullMQAdapter },
      { name: REPORTS_QUEUE_NAME, adapter: BullMQAdapter },
      { name: AI_PRODUCT_ENRICHMENT_QUEUE, adapter: BullMQAdapter },
    ),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

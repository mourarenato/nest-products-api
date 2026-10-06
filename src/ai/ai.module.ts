import { BullModule } from '@nestjs/bullmq';
import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NextFunction, Request, Response } from 'express';
import { Product } from '../products/entities/product.entity';
import { AiController, AiProductEnrichmentController } from './ai.controller';
import { AiProcessor } from './ai.processor';
import { AI_PRODUCT_ENRICHMENT_QUEUE, AiService } from './ai.service';

function sseQueryTokenMiddleware(
  request: Request,
  _response: Response,
  next: NextFunction,
): void {
  const token = request.query.token;
  if (
    !request.headers.authorization &&
    typeof token === 'string' &&
    token.length > 0
  ) {
    request.headers.authorization = `Bearer ${token}`;
  }

  next();
}

@Module({
  imports: [
    TypeOrmModule.forFeature([Product]),
    BullModule.registerQueue({
      name: AI_PRODUCT_ENRICHMENT_QUEUE,
    }),
  ],
  controllers: [AiController, AiProductEnrichmentController],
  providers: [AiService, AiProcessor],
})
export class AiModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(sseQueryTokenMiddleware).forRoutes({
      path: 'ai/stream-analysis/:productId',
      method: RequestMethod.GET,
    });
  }
}

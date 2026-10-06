import {
  Injectable,
  Logger,
  MessageEvent,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import OpenAI from 'openai';
import { Observable } from 'rxjs';
import { Repository } from 'typeorm';
import { Product } from '../products/entities/product.entity';

export const AI_PRODUCT_ENRICHMENT_QUEUE = 'ai-product-enrichment';
export const AI_ENRICH_DESCRIPTION_JOB = 'enrich-description';

const OPENAI_MODEL = 'gpt-4o-mini';

type EnrichmentJobData = {
  productId: string;
};

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectQueue(AI_PRODUCT_ENRICHMENT_QUEUE)
    private readonly enrichmentQueue: Queue<EnrichmentJobData>,
    private readonly configService: ConfigService,
  ) {}

  async enqueueProductEnrichment(productId: string): Promise<string> {
    await this.findProduct(productId);

    const job = await this.enrichmentQueue.add(
      AI_ENRICH_DESCRIPTION_JOB,
      { productId },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 1000,
        removeOnFail: 1000,
      },
    );

    return String(job.id);
  }

  async enrichProductDescription(productId: string): Promise<void> {
    const product = await this.findProduct(productId);
    const description = await this.generateDescription(product);
    product.description = description;
    await this.productsRepository.save(product);
    this.logger.log(`Updated description for product ${product.id}`);
  }

  async streamProductAnalysis(
    productId: string,
  ): Promise<Observable<MessageEvent>> {
    const product = await this.findProduct(productId);
    const client = this.getClient();
    const prompt = this.buildAnalysisPrompt(product);

    return new Observable<MessageEvent>((subscriber) => {
      const abortController = new AbortController();
      let closed = false;

      const run = async () => {
        const stream = await client.chat.completions.create(
          {
            model: OPENAI_MODEL,
            stream: true,
            messages: [
              {
                role: 'system',
                content:
                  'Você é um analista de mercado de produtos. Responda em português, com insights objetivos sobre posicionamento, público e diferenciais.',
              },
              { role: 'user', content: prompt },
            ],
          },
          { signal: abortController.signal },
        );

        for await (const part of stream) {
          if (closed) {
            break;
          }

          const chunk = part.choices[0]?.delta?.content ?? '';
          if (chunk) {
            subscriber.next({ data: { chunk } });
          }
        }

        if (!closed) {
          subscriber.next({ data: { chunk: '', done: true } });
          subscriber.complete();
        }
      };

      run().catch((error: unknown) => {
        if (closed || abortController.signal.aborted) {
          return;
        }

        subscriber.error(error);
      });

      return () => {
        closed = true;
        abortController.abort();
      };
    });
  }

  private async generateDescription(product: Product): Promise<string> {
    const client = this.getClient();
    const completion = await client.chat.completions.create({
      model: OPENAI_MODEL,
      temperature: 0.7,
      messages: [
        {
          role: 'system',
          content:
            'Você escreve descrições de catálogo. Responda apenas com o texto da descrição, em português, sem título e sem markdown.',
        },
        {
          role: 'user',
          content: [
            'Gere uma descrição rica para este produto a partir do nome e da categoria que puder ser inferida.',
            `Nome: ${product.name}`,
            `Descrição atual: ${product.description?.trim() || 'não informada'}`,
            `Preço: ${product.price}`,
          ].join('\n'),
        },
      ],
    });

    const description = completion.choices[0]?.message?.content?.trim();
    if (!description) {
      throw new ServiceUnavailableException(
        'The language model returned an empty description',
      );
    }

    return description;
  }

  private buildAnalysisPrompt(product: Product): string {
    return [
      'Faça uma análise de mercado e traga insights acionáveis sobre este produto.',
      `Nome: ${product.name}`,
      `Descrição: ${product.description?.trim() || 'não informada'}`,
      `Preço: ${product.price}`,
      'Considere a categoria implícita no nome do produto.',
    ].join('\n');
  }

  private async findProduct(productId: string): Promise<Product> {
    const product = await this.productsRepository.findOne({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException(`Product with id "${productId}" not found`);
    }

    return product;
  }

  private getClient(): OpenAI {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new ServiceUnavailableException('OPENAI_API_KEY is not configured');
    }

    return new OpenAI({ apiKey });
  }
}

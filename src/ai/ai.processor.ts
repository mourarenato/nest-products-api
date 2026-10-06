import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import {
  AI_ENRICH_DESCRIPTION_JOB,
  AI_PRODUCT_ENRICHMENT_QUEUE,
  AiService,
} from './ai.service';

type EnrichmentJobData = {
  productId: string;
};

@Processor(AI_PRODUCT_ENRICHMENT_QUEUE)
export class AiProcessor extends WorkerHost {
  private readonly logger = new Logger(AiProcessor.name);

  constructor(private readonly aiService: AiService) {
    super();
  }

  async process(job: Job<EnrichmentJobData>): Promise<void> {
    if (job.name !== AI_ENRICH_DESCRIPTION_JOB) {
      this.logger.warn(`Skipping unsupported job type: ${job.name}`);
      return;
    }

    await this.aiService.enrichProductDescription(job.data.productId);
    this.logger.log(
      `Processed AI enrichment job ${job.id} for product ${job.data.productId}`,
    );
  }
}

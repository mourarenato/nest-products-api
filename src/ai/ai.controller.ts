import {
  Controller,
  MessageEvent,
  Param,
  ParseUUIDPipe,
  Post,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiService } from './ai.service';

@Controller('products')
export class AiProductEnrichmentController {
  constructor(private readonly aiService: AiService) {}

  @Post(':id/enrich-description')
  @UseGuards(JwtAuthGuard)
  async enrichDescription(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<{ message: string; jobId: string }> {
    const jobId = await this.aiService.enqueueProductEnrichment(id);
    return {
      message: 'Job enfileirado com sucesso',
      jobId,
    };
  }
}

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Sse('stream-analysis/:productId')
  @UseGuards(JwtAuthGuard)
  streamAnalysis(
    @Param('productId', new ParseUUIDPipe()) productId: string,
  ): Promise<Observable<MessageEvent>> {
    return this.aiService.streamProductAnalysis(productId);
  }
}

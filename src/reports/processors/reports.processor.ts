import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { REPORT_GENERATE_JOB, REPORTS_QUEUE_NAME } from '../constants/reports-queue.constants';
import { ReportsService } from '../reports.service';

type ReportJobData = {
  reportId: string;
};

@Processor(REPORTS_QUEUE_NAME)
export class ReportsProcessor extends WorkerHost {
  private readonly logger = new Logger(ReportsProcessor.name);

  constructor(private readonly reportsService: ReportsService) {
    super();
  }

  async process(job: Job<ReportJobData>): Promise<void> {
    if (job.name !== REPORT_GENERATE_JOB) {
      this.logger.warn(`Skipping unsupported job type: ${job.name}`);
      return;
    }

    try {
      await this.reportsService.processReport(job.data.reportId);
      this.logger.log(`Processed report job ${job.id} for report ${job.data.reportId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      await this.reportsService.markAsFailed(job.data.reportId, message);
      throw error;
    }
  }
}

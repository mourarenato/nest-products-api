import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { Product } from '../products/entities/product.entity';
import { REPORT_GENERATE_JOB, REPORTS_QUEUE_NAME } from './constants/reports-queue.constants';
import { Report } from './entities/report.entity';
import { ReportStatus } from './enums/report-status.enum';

const REPORT_BATCH_SIZE = 100;

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Report)
    private readonly reportsRepository: Repository<Report>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectQueue(REPORTS_QUEUE_NAME)
    private readonly reportsQueue: Queue,
  ) {}

  async enqueueGeneration(requestedByUserId: string): Promise<{ reportId: string; jobId: string }> {
    const report = this.reportsRepository.create({
      requestedByUserId,
      status: ReportStatus.PENDING,
    });
    const savedReport = await this.reportsRepository.save(report);

    const job = await this.reportsQueue.add(
      REPORT_GENERATE_JOB,
      { reportId: savedReport.id },
      { removeOnComplete: 1000, removeOnFail: 1000 },
    );

    return {
      reportId: savedReport.id,
      jobId: String(job.id),
    };
  }

  async findOne(reportId: string): Promise<Report> {
    const report = await this.reportsRepository.findOne({ where: { id: reportId } });
    if (!report) {
      throw new NotFoundException(`Report with id "${reportId}" not found`);
    }
    return report;
  }

  async processReport(reportId: string): Promise<void> {
    const report = await this.findOne(reportId);
    report.status = ReportStatus.PROCESSING;
    report.errorMessage = undefined;
    await this.reportsRepository.save(report);

    let totalProducts = 0;
    let totalPrice = 0;
    let page = 1;
    const csvChunks: string[] = ['id,name,description,price\n'];

    while (true) {
      const batch = await this.productsRepository.find({
        order: { name: 'ASC' },
        skip: (page - 1) * REPORT_BATCH_SIZE,
        take: REPORT_BATCH_SIZE,
      });

      if (batch.length === 0) {
        break;
      }

      for (const product of batch) {
        totalProducts += 1;
        totalPrice += Number(product.price);
      }

      const csvLines = batch
        .map((product) => {
          const safeName = this.escapeCsv(product.name);
          const safeDescription = this.escapeCsv(product.description ?? '');
          return `${product.id},"${safeName}","${safeDescription}",${Number(product.price)}`;
        })
        .join('\n');
      csvChunks.push(`${csvLines}\n`);

      page += 1;
    }

    report.totalProducts = totalProducts;
    report.averagePrice = totalProducts > 0 ? Number((totalPrice / totalProducts).toFixed(2)) : 0;
    report.status = ReportStatus.COMPLETED;
    report.generatedAt = new Date();
    report.fileName = `report-${report.id}.csv`;
    report.csvContent = csvChunks.join('');
    report.errorMessage = undefined;
    await this.reportsRepository.save(report);
  }

  async markAsFailed(reportId: string, errorMessage: string): Promise<void> {
    const report = await this.findOne(reportId);
    report.status = ReportStatus.FAILED;
    report.errorMessage = errorMessage;
    await this.reportsRepository.save(report);
  }

  async getDownloadData(reportId: string): Promise<{ fileName: string; csvContent: string }> {
    const report = await this.findOne(reportId);
    if (report.status !== ReportStatus.COMPLETED || !report.csvContent) {
      throw new NotFoundException(`Report with id "${reportId}" is not ready for download`);
    }

    return {
      fileName: report.fileName ?? `report-${report.id}.csv`,
      csvContent: report.csvContent,
    };
  }

  private escapeCsv(value: string): string {
    return value.replace(/"/g, '""');
  }
}

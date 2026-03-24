import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { ReportStatus } from '../enums/report-status.enum';

@Entity({ name: 'reports' })
export class Report {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'requested_by_user_id', type: 'uuid' })
  requestedByUserId!: string;

  @Column({
    type: 'enum',
    enum: ReportStatus,
    default: ReportStatus.PENDING,
  })
  status!: ReportStatus;

  @Column({ name: 'total_products', type: 'int', nullable: true })
  totalProducts?: number;

  @Column({ name: 'average_price', type: 'numeric', precision: 10, scale: 2, nullable: true })
  averagePrice?: number;

  @Column({ name: 'generated_at', type: 'timestamp', nullable: true })
  generatedAt?: Date;

  @Column({ name: 'file_name', type: 'text', nullable: true })
  fileName?: string;

  @Column({ name: 'csv_content', type: 'text', nullable: true })
  csvContent?: string;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

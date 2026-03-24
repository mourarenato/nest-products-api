import { Controller, Get, Param, ParseUUIDPipe, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/enums/user-role.enum';
import { Report } from './entities/report.entity';
import { ReportsService } from './reports.service';

type AuthenticatedRequest = {
  user: JwtPayload;
};

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post('generate')
  async generate(@Req() request: AuthenticatedRequest): Promise<{ reportId: string; jobId: string }> {
    return this.reportsService.enqueueGeneration(request.user.sub);
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string): Promise<Report> {
    return this.reportsService.findOne(id);
  }

  @Get(':id/download')
  async download(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Res() response: Response,
  ): Promise<void> {
    const report = await this.reportsService.getDownloadData(id);

    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader('Content-Disposition', `attachment; filename="${report.fileName}"`);
    response.send(report.csvContent);
  }
}

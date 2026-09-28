import {
  Controller,
  Get,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get('live')
  @ApiOperation({ summary: 'Confirm that the API process is running' })
  @ApiResponse({ status: 200, description: 'The API process is running.' })
  live() {
    return {
      status: 'ok',
      service: 'operations-hub-api',
    };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Confirm that the API and database are ready' })
  @ApiResponse({ status: 200, description: 'The API and database are ready.' })
  @ApiResponse({ status: 503, description: 'The database is unavailable.' })
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        checks: { database: 'up' },
      };
    } catch {
      this.logger.error('Readiness check failed: database unavailable');
      throw new ServiceUnavailableException({
        status: 'unavailable',
        checks: { database: 'down' },
      });
    }
  }
}

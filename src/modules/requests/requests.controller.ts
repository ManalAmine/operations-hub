import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestStatusDto } from './dto/update-request-status.dto';
import { RequestsService } from './requests.service';

@Controller('requests')
export class RequestsController {
  constructor(private readonly requests: RequestsService) {}

  @Get('lifecycle')
  getLifecycle() {
    return this.requests.getLifecycle();
  }

  @Post()
  submit(@Body() input: CreateRequestDto) {
    return this.requests.submit(input);
  }

  @Get()
  findAll() {
    return this.requests.findAll();
  }

  @Get(':requestId')
  findOne(@Param('requestId') requestId: string) {
    return this.requests.findOne(requestId);
  }

  @Patch(':requestId/status')
  updateStatus(
    @Param('requestId') requestId: string,
    @Body() input: UpdateRequestStatusDto,
  ) {
    return this.requests.updateStatus(requestId, input);
  }
}

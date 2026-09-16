import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthenticatedUser } from '../../auth/auth.types';
import { CurrentUser } from '../../auth/current-user.decorator';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CreateRequestDto } from './dto/create-request.dto';
import { RequestResponseDto } from './dto/request-response.dto';
import { UpdateRequestStatusDto } from './dto/update-request-status.dto';
import { RequestsService } from './requests.service';

@ApiTags('requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('requests')
export class RequestsController {
  constructor(private readonly requests: RequestsService) {}

  @Get('lifecycle')
  getLifecycle() {
    return this.requests.getLifecycle();
  }

  @Post()
  @ApiCreatedResponse({ type: RequestResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid request or inactive department.' })
  submit(@CurrentUser() user: AuthenticatedUser, @Body() input: CreateRequestDto) {
    return this.requests.submit(user, input);
  }

  @Get()
  @ApiOkResponse({ type: [RequestResponseDto] })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.requests.findAll(user);
  }

  @Get(':requestId')
  @ApiOkResponse({ type: RequestResponseDto })
  @ApiForbiddenResponse({ description: 'The user cannot access this request.' })
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('requestId') requestId: string) {
    return this.requests.findOne(user, requestId);
  }

  @Patch(':requestId/status')
  @ApiOkResponse({ type: RequestResponseDto })
  @ApiForbiddenResponse({ description: 'Only staff in the responsible department can update this request.' })
  @ApiConflictResponse({ description: 'The transition is invalid or the request has already changed.' })
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('requestId') requestId: string,
    @Body() input: UpdateRequestStatusDto,
  ) {
    return this.requests.updateStatus(user, requestId, input);
  }
}

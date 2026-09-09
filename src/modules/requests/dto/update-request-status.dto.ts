import { IsEnum } from 'class-validator';
import { RequestStatus } from '../requests.data';

export class UpdateRequestStatusDto {
  @IsEnum(RequestStatus)
  status: RequestStatus;

  @IsEnum(RequestStatus)
  expectedCurrentStatus: RequestStatus;
}

import { Injectable } from '@nestjs/common';
import {
  REQUEST_TYPES,
  TrustedDepartment,
  TrustedRequestContext,
} from './request-assistance.contract';

@Injectable()
export class TrustedRequestContextService {
  build(departments: TrustedDepartment[], selectedDepartmentId: string): TrustedRequestContext {
    return {
      departments: departments.map(({ id, name }) => ({ id, name })),
      selectedDepartmentId,
      requestTypes: REQUEST_TYPES,
      playbooks: [],
    };
  }
}

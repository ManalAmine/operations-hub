import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { RequestsModule } from './modules/requests/requests.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule, AuthModule, DepartmentsModule, RequestsModule],
})
export class AppModule {}

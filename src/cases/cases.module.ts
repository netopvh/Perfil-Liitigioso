import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Case } from '../entities/case.entity';
import { Company } from '../entities/company.entity';
import { CaseMovement } from '../entities/case-movement.entity';
import { CompaniesModule } from '../companies/companies.module';
import { CompaniesCasesController, CasesController } from './cases.controller';
import { CasesService } from './cases.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Case, Company, CaseMovement]),
    CompaniesModule,
  ],
  controllers: [CompaniesCasesController, CasesController],
  providers: [CasesService],
  exports: [CasesService],
})
export class CasesModule {}

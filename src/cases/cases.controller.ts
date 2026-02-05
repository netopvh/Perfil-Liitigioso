import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CasesService } from './cases.service';
import { CaseQueryDto } from './dto/case-query.dto';
import { CaseListResponseDto } from './dto/case-list.dto';
import { CaseDetailResponseDto } from './dto/case-detail.dto';

@ApiTags('cases')
@Controller('companies')
export class CompaniesCasesController {
  constructor(private cases: CasesService) {}

  @Get(':cnpj/cases')
  @ApiOperation({ summary: 'Listar processos da empresa com filtros' })
  @ApiResponse({ status: 200, type: CaseListResponseDto })
  async list(
    @Param('cnpj') cnpj: string,
    @Query() query: CaseQueryDto,
  ) {
    return this.cases.listByCompany(
      cnpj,
      {
        ramo: query.ramo,
        status: query.status,
        tribunal: query.tribunal,
        from: query.from,
        to: query.to,
      },
      query.page ?? 1,
      query.limit ?? 20,
    );
  }
}

@ApiTags('cases')
@Controller('cases')
export class CasesController {
  constructor(private cases: CasesService) {}

  @Get(':processId')
  @ApiOperation({ summary: 'Detalhe do processo por ID' })
  @ApiResponse({ status: 200, type: CaseDetailResponseDto })
  @ApiResponse({ status: 404, description: 'Processo não encontrado' })
  async getById(@Param('processId') processId: string) {
    return this.cases.getById(processId);
  }
}

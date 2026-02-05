import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CompaniesService } from './companies.service';
import { SimulateRecomputeDto } from './dto/simulate-recompute.dto';
import { LitigationProfileResponseDto } from './dto/litigation-profile.dto';

@ApiTags('companies')
@Controller('companies')
export class CompaniesController {
  constructor(private companies: CompaniesService) {}

  @Get()
  @ApiOperation({ summary: 'Buscar empresas por nome ou CNPJ' })
  @ApiResponse({ status: 200, description: 'Lista de empresas' })
  async search(@Query('query') query: string) {
    const list = await this.companies.search(query ?? '');
    return list;
  }

  @Get(':cnpj')
  @ApiOperation({ summary: 'Obter empresa por CNPJ' })
  @ApiResponse({ status: 200, description: 'Dados da empresa' })
  @ApiResponse({ status: 404, description: 'Empresa não encontrada' })
  async getByCnpj(@Param('cnpj') cnpj: string) {
    const company = await this.companies.getByCnpj(cnpj);
    if (!company) throw new NotFoundException('Empresa não encontrada');
    return company;
  }

  @Get(':cnpj/litigation-profile')
  @ApiOperation({ summary: 'Perfil litigioso da empresa' })
  @ApiResponse({
    status: 200,
    description: 'Perfil com score, KPIs e séries',
    type: LitigationProfileResponseDto,
  })
  async getLitigationProfile(@Param('cnpj') cnpj: string) {
    return this.companies.getLitigationProfile(cnpj);
  }

  @Post(':cnpj/simulate/recompute')
  @ApiOperation({ summary: 'Simular recálculo do score (cenário "e se?")' })
  @ApiResponse({ status: 200, description: 'Novo score e KPIs simulados' })
  async simulateRecompute(
    @Param('cnpj') cnpj: string,
    @Body() body: SimulateRecomputeDto,
  ) {
    return this.companies.simulateRecompute(cnpj, body.scenario);
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisService } from '../redis/redis.service';
import { Company } from '../entities/company.entity';
import { Case } from '../entities/case.entity';
import { CaseMovement } from '../entities/case-movement.entity';
import { generateCompany } from '../generators/company.generator';
import { generateCases } from '../generators/case.generator';
import { PaginationResult } from '../common/pagination';
import { CaseFilterParams, hashFilters } from '../common/filters';
import { CompaniesService } from '../companies/companies.service';

const CACHE_TTL = 3600;
const CASES_CACHE_PREFIX = 'cases:';

export interface CaseListItem {
  process_id: string;
  numero_cnj: string;
  tribunal: string;
  ramo: string;
  classe: string;
  assuntos: string[] | null;
  polo: string;
  status: string;
  fase: string | null;
  data_distribuicao: string;
  data_ultima_movimentacao: string;
  valor_causa: number;
  desfecho: string | null;
}

function maskIfSecret(item: Case, listItem: CaseListItem): CaseListItem {
  if (!item.segredo_justica) return listItem;
  return {
    ...listItem,
    valor_causa: 0,
    assuntos: null,
    classe: '***',
  };
}

@Injectable()
export class CasesService {
  constructor(
    @InjectRepository(Case)
    private caseRepo: Repository<Case>,
    @InjectRepository(Company)
    private companyRepo: Repository<Company>,
    @InjectRepository(CaseMovement)
    private movementRepo: Repository<CaseMovement>,
    private redis: RedisService,
    private companiesService: CompaniesService,
  ) {}

  private normalizeCnpj(cnpj: string): string {
    const d = cnpj.replace(/\D/g, '');
    if (d.length !== 14) return cnpj;
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  }

  async listByCompany(
    cnpj: string,
    filters: CaseFilterParams,
    page: number,
    limit: number,
  ): Promise<PaginationResult<CaseListItem>> {
    const normalized = this.normalizeCnpj(cnpj);
    const cacheKey = `${CASES_CACHE_PREFIX}${normalized}:${hashFilters(filters)}:${page}:${limit}`;
    const cached = await this.redis.get<PaginationResult<CaseListItem>>(cacheKey);
    if (cached) return cached;

    let company = await this.companyRepo.findOne({
      where: { cnpj: normalized },
    });
    if (!company) {
      const g = generateCompany(normalized);
      company = this.companyRepo.create({
        cnpj: g.cnpj,
        razao_social: g.razao_social,
        nome_fantasia: g.nome_fantasia,
        setor: g.setor,
        porte: g.porte,
        uf_sede: g.uf_sede,
        risco_score: 0,
        classificacao: 'baixo',
      });
      await this.companyRepo.save(company);
      await this.companiesService.ensureCasesForCompany(company.cnpj, g.uf_sede);
    }

    const qb = this.caseRepo
      .createQueryBuilder('c')
      .where('c.company_cnpj = :cnpj', { cnpj: normalized });

    if (filters.ramo) qb.andWhere('c.ramo = :ramo', { ramo: filters.ramo });
    if (filters.status)
      qb.andWhere('c.status = :status', { status: filters.status });
    if (filters.tribunal)
      qb.andWhere('c.tribunal = :tribunal', { tribunal: filters.tribunal });
    if (filters.from)
      qb.andWhere('c.data_distribuicao >= :from', {
        from: filters.from,
      });
    if (filters.to)
      qb.andWhere('c.data_distribuicao <= :to', { to: filters.to });

    const [cases, total] = await qb
      .orderBy('c.data_ultima_movimentacao', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const data = cases.map((c) => {
      const listItem: CaseListItem = {
        process_id: c.process_id,
        numero_cnj: c.numero_cnj,
        tribunal: c.tribunal,
        ramo: c.ramo,
        classe: c.classe,
        assuntos: c.assuntos,
        polo: c.polo,
        status: c.status,
        fase: c.fase,
        data_distribuicao:
          typeof c.data_distribuicao === 'string'
            ? c.data_distribuicao
            : (c.data_distribuicao as Date).toISOString().slice(0, 10),
        data_ultima_movimentacao:
          typeof c.data_ultima_movimentacao === 'string'
            ? c.data_ultima_movimentacao
            : (c.data_ultima_movimentacao as Date).toISOString().slice(0, 10),
        valor_causa: Number(c.valor_causa),
        desfecho: c.desfecho,
      };
      return maskIfSecret(c, listItem);
    });

    const result: PaginationResult<CaseListItem> = {
      data,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
    await this.redis.set(cacheKey, result, CACHE_TTL);
    return result;
  }

  async getById(processId: string) {
    const caseEntity = await this.caseRepo.findOne({
      where: { process_id: processId },
      relations: ['movimentacoes'],
    });
    if (!caseEntity) throw new NotFoundException('Processo não encontrado');

    const movimentacoes = (caseEntity.movimentacoes ?? []).map((m) => ({
      tipo: m.tipo,
      data:
        typeof m.data === 'string'
          ? m.data
          : (m.data as Date).toISOString().slice(0, 10),
      descricao: m.descricao,
    }));

    const valorCausa = caseEntity.segredo_justica
      ? 0
      : Number(caseEntity.valor_causa);
    const assuntos = caseEntity.segredo_justica ? null : caseEntity.assuntos;
    const classe = caseEntity.segredo_justica ? '***' : caseEntity.classe;

    return {
      process_id: caseEntity.process_id,
      numero_cnj: caseEntity.numero_cnj,
      tribunal: caseEntity.tribunal,
      ramo: caseEntity.ramo,
      classe,
      assuntos,
      polo: caseEntity.polo,
      status: caseEntity.status,
      fase: caseEntity.fase,
      data_distribuicao:
        typeof caseEntity.data_distribuicao === 'string'
          ? caseEntity.data_distribuicao
          : (caseEntity.data_distribuicao as Date).toISOString().slice(0, 10),
      data_ultima_movimentacao:
        typeof caseEntity.data_ultima_movimentacao === 'string'
          ? caseEntity.data_ultima_movimentacao
          : (caseEntity.data_ultima_movimentacao as Date)
              .toISOString()
              .slice(0, 10),
      valor_causa: valorCausa,
      probabilidade_condenacao: Number(caseEntity.probabilidade_condenacao),
      desfecho: caseEntity.desfecho,
      custos_estimados: caseEntity.custos_estimados,
      movimentacoes,
    };
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisService } from '../redis/redis.service';
import { Company } from '../entities/company.entity';
import { Case } from '../entities/case.entity';
import { CaseMovement } from '../entities/case-movement.entity';
import {
  generateCompany,
  generateCompaniesForQuery,
  CompanyGenerated,
} from '../generators/company.generator';
import { generateCases } from '../generators/case.generator';
import {
  calculateScore,
  computeKpisFromCases,
  KpisForScore,
} from '../generators/score.calculator';
import { CaseGenerated } from '../generators/case.generator';

const CACHE_TTL = 3600;
const COMPANY_CACHE_PREFIX = 'company:';
const LITIGATION_CACHE_PREFIX = 'litigation:';

export interface LitigationProfilePayload {
  company: { cnpj: string; razao_social: string; setor?: string; uf_sede?: string };
  score: { value: number; classification: string; drivers: { key: string; impact: number }[] };
  kpis: {
    total_cases: number;
    active_cases: number;
    new_cases_12m: number;
    settlement_rate: number;
    estimated_conviction_rate: number;
    value_at_risk: number;
    avg_resolution_days: number;
  };
  breakdowns: {
    by_branch: { branch: string; count: number }[];
    top_subjects: { subject: string; count: number }[];
  };
  series_12m: { month: string; opened: number; closed: number }[];
  updated_at: string;
}

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private companyRepo: Repository<Company>,
    @InjectRepository(Case)
    private caseRepo: Repository<Case>,
    @InjectRepository(CaseMovement)
    private movementRepo: Repository<CaseMovement>,
    private redis: RedisService,
  ) {}

  private normalizeCnpj(cnpj: string): string {
    const d = cnpj.replace(/\D/g, '');
    if (d.length !== 14) return cnpj;
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  }

  async search(query?: string): Promise<Company[]> {
    const q = query?.trim() ?? '';

    if (q === '') {
      const all = await this.companyRepo.find({
        take: 50,
        order: { last_updated: 'DESC' },
      });
      if (all.length > 0) return all;
      const demo = generateCompaniesForQuery('demo', 5);
      return this.persistGeneratedCompanies(demo);
    }

    const term = `%${q.toLowerCase()}%`;
    const existing = await this.companyRepo
      .createQueryBuilder('c')
      .where('LOWER(c.razao_social) LIKE :term OR LOWER(c.cnpj) LIKE :term', {
        term,
      })
      .take(20)
      .getMany();
    if (existing.length > 0) return existing;

    const generated = generateCompaniesForQuery(q, 5);
    return this.persistGeneratedCompanies(generated);
  }

  private async persistGeneratedCompanies(
    generated: CompanyGenerated[],
  ): Promise<Company[]> {
    const saved: Company[] = [];
    for (const g of generated) {
      let company = await this.companyRepo.findOne({ where: { cnpj: g.cnpj } });
      if (!company) {
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
      }
      saved.push(company);
    }
    return saved;
  }

  async getByCnpj(cnpj: string): Promise<Company | null> {
    const normalized = this.normalizeCnpj(cnpj);
    const cacheKey = `${COMPANY_CACHE_PREFIX}${normalized}`;
    const cached = await this.redis.get<Company>(cacheKey);
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
      await this.ensureCasesForCompany(company.cnpj, g.uf_sede);
      company = await this.companyRepo.findOne({
        where: { cnpj: company.cnpj },
      })!;
      const cases = await this.caseRepo.find({
        where: { company_cnpj: company!.cnpj },
      });
      const kpis = computeKpisFromCases(this.caseEntitiesToGenerated(cases));
      const score = calculateScore(kpis);
      company!.risco_score = score.value;
      company!.classificacao = score.classification;
      await this.companyRepo.save(company!);
    }
    const payload = {
      ...company,
      last_updated: company!.last_updated?.toISOString?.() ?? new Date().toISOString(),
    };
    await this.redis.set(cacheKey, payload, CACHE_TTL);
    return payload as unknown as Company;
  }

  private caseEntitiesToGenerated(cases: Case[]): CaseGenerated[] {
    return cases.map((c) => ({
      process_id: c.process_id,
      numero_cnj: c.numero_cnj,
      tribunal: c.tribunal,
      ramo: c.ramo,
      classe: c.classe,
      assuntos: c.assuntos ?? [],
      polo: c.polo,
      status: c.status,
      fase: c.fase,
      data_distribuicao: c.data_distribuicao,
      data_ultima_movimentacao: c.data_ultima_movimentacao,
      valor_causa: Number(c.valor_causa),
      probabilidade_condenacao: Number(c.probabilidade_condenacao),
      desfecho: c.desfecho,
      custos_estimados: c.custos_estimados ?? { min: 0, max: 0 },
      segredo_justica: c.segredo_justica,
      movimentacoes: (c.movimentacoes ?? []).map((m) => ({
        tipo: m.tipo,
        data: m.data,
        descricao: m.descricao,
      })),
    }));
  }

  async ensureCasesForCompany(cnpj: string, ufSede: string): Promise<void> {
    const count = await this.caseRepo.count({ where: { company_cnpj: cnpj } });
    if (count > 0) return;
    const normalized = this.normalizeCnpj(cnpj);
    const generated = generateCases(normalized, ufSede);
    for (const g of generated) {
      const caseEntity = this.caseRepo.create({
        process_id: g.process_id,
        company_cnpj: cnpj,
        numero_cnj: g.numero_cnj,
        tribunal: g.tribunal,
        ramo: g.ramo,
        classe: g.classe,
        assuntos: g.assuntos,
        polo: g.polo,
        status: g.status,
        fase: g.fase,
        data_distribuicao: g.data_distribuicao,
        data_ultima_movimentacao: g.data_ultima_movimentacao,
        valor_causa: g.valor_causa,
        probabilidade_condenacao: g.probabilidade_condenacao,
        desfecho: g.desfecho,
        custos_estimados: g.custos_estimados,
        segredo_justica: g.segredo_justica,
      });
      await this.caseRepo.save(caseEntity);
      for (const m of g.movimentacoes) {
        await this.movementRepo.save(
          this.movementRepo.create({
            case_process_id: g.process_id,
            tipo: m.tipo,
            data: m.data,
            descricao: m.descricao,
          }),
        );
      }
    }
  }

  async getLitigationProfile(cnpj: string): Promise<LitigationProfilePayload> {
    const normalized = this.normalizeCnpj(cnpj);
    const cacheKey = `${LITIGATION_CACHE_PREFIX}${normalized}`;
    const cached = await this.redis.get<LitigationProfilePayload>(cacheKey);
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
      await this.ensureCasesForCompany(company.cnpj, g.uf_sede);
    }

    const cases = await this.caseRepo.find({
      where: { company_cnpj: normalized },
      relations: ['movimentacoes'],
    });
    const generatedCases = this.caseEntitiesToGenerated(cases);
    const kpis = computeKpisFromCases(generatedCases);
    const score = calculateScore(kpis);

    company.risco_score = score.value;
    company.classificacao = score.classification;
    await this.companyRepo.save(company);

    const activeCases = cases.filter((c) => c.status === 'ativo');
    const baixados = cases.filter((c) => c.status === 'baixado');
    const comAcordo = baixados.filter((c) => c.desfecho === 'acordo').length;
    const settlementRate = baixados.length > 0 ? comAcordo / baixados.length : 0;
    const estimatedConviction =
      generatedCases.length > 0
        ? generatedCases.reduce((s, c) => s + c.probabilidade_condenacao, 0) /
          generatedCases.length
        : 0;
    const valueAtRisk = activeCases.reduce(
      (s, c) => s + Number(c.valor_causa),
      0,
    );
    const resolvedWithDate = baixados.filter(
      (c) => c.data_distribuicao && c.data_ultima_movimentacao,
    );
    const avgResolutionDays =
      resolvedWithDate.length > 0
        ? Math.round(
            resolvedWithDate.reduce((acc, c) => {
              const d = new Date(c.data_distribuicao).getTime();
              const u = new Date(c.data_ultima_movimentacao).getTime();
              return acc + (u - d) / (1000 * 60 * 60 * 24);
            }, 0) / resolvedWithDate.length,
          )
        : 0;

    const byBranch: Record<string, number> = {};
    for (const c of cases) {
      byBranch[c.ramo] = (byBranch[c.ramo] ?? 0) + 1;
    }
    const subjectCount: Record<string, number> = {};
    for (const c of cases) {
      for (const a of c.assuntos ?? []) {
        subjectCount[a] = (subjectCount[a] ?? 0) + 1;
      }
    }
    const topSubjects = Object.entries(subjectCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([subject, count]) => ({ subject, count }));

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);
    const seriesMap: Record<string, { opened: number; closed: number }> = {};
    for (let i = 0; i < 12; i++) {
      const d = new Date(twelveMonthsAgo);
      d.setMonth(d.getMonth() + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      seriesMap[key] = { opened: 0, closed: 0 };
    }
    for (const c of cases) {
      const dist = new Date(c.data_distribuicao);
      const key = `${dist.getFullYear()}-${String(dist.getMonth() + 1).padStart(2, '0')}`;
      if (seriesMap[key]) seriesMap[key].opened++;
      if (c.status === 'baixado' && c.data_ultima_movimentacao) {
        const ult = new Date(c.data_ultima_movimentacao);
        const keyU = `${ult.getFullYear()}-${String(ult.getMonth() + 1).padStart(2, '0')}`;
        if (seriesMap[keyU]) seriesMap[keyU].closed++;
      }
    }
    const series_12m = Object.entries(seriesMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, v]) => ({ month, ...v }));

    const payload: LitigationProfilePayload = {
      company: {
        cnpj: company.cnpj,
        razao_social: company.razao_social,
        setor: company.setor ?? undefined,
        uf_sede: company.uf_sede ?? undefined,
      },
      score: {
        value: score.value,
        classification: score.classification,
        drivers: score.drivers,
      },
      kpis: {
        total_cases: cases.length,
        active_cases: activeCases.length,
        new_cases_12m: kpis.newCases12m,
        settlement_rate: Math.round(settlementRate * 100) / 100,
        estimated_conviction_rate: Math.round(estimatedConviction * 100) / 100,
        value_at_risk: valueAtRisk,
        avg_resolution_days: avgResolutionDays,
      },
      breakdowns: {
        by_branch: Object.entries(byBranch).map(([branch, count]) => ({
          branch,
          count,
        })),
        top_subjects: topSubjects,
      },
      series_12m,
      updated_at: new Date().toISOString(),
    };
    await this.redis.set(cacheKey, payload, CACHE_TTL);
    return payload;
  }

  async simulateRecompute(
    cnpj: string,
    scenario?: string,
  ): Promise<LitigationProfilePayload['score'] & { kpis: LitigationProfilePayload['kpis'] }> {
    const normalized = this.normalizeCnpj(cnpj);
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
      await this.ensureCasesForCompany(company.cnpj, g.uf_sede);
    }
    const cases = await this.caseRepo.find({
      where: { company_cnpj: normalized },
    });
    const generated = this.caseEntitiesToGenerated(cases);
    const kpis: KpisForScore = computeKpisFromCases(generated);
    const score = calculateScore(kpis, scenario);

    const activeCases = cases.filter((c) => c.status === 'ativo');
    const baixados = cases.filter((c) => c.status === 'baixado');
    const comAcordo = baixados.filter((c) => c.desfecho === 'acordo').length;
    let settlementRate = baixados.length > 0 ? comAcordo / baixados.length : 0;
    let valueAtRisk = activeCases.reduce((s, c) => s + Number(c.valor_causa), 0);
    if (scenario === 'aggressive_settlement') {
      settlementRate = Math.min(0.7, settlementRate + 0.35);
      valueAtRisk = Math.round(valueAtRisk * 0.6);
    }
    const estimatedConviction =
      generated.length > 0
        ? generated.reduce((s, c) => s + c.probabilidade_condenacao, 0) /
          generated.length
        : 0;
    const resolvedWithDate = baixados.filter(
      (c) => c.data_distribuicao && c.data_ultima_movimentacao,
    );
    const avgResolutionDays =
      resolvedWithDate.length > 0
        ? Math.round(
            resolvedWithDate.reduce((acc, c) => {
              const d = new Date(c.data_distribuicao).getTime();
              const u = new Date(c.data_ultima_movimentacao).getTime();
              return acc + (u - d) / (1000 * 60 * 60 * 24);
            }, 0) / resolvedWithDate.length,
          )
        : 0;

    return {
      ...score,
      kpis: {
        total_cases: cases.length,
        active_cases: activeCases.length,
        new_cases_12m: kpis.newCases12m,
        settlement_rate: Math.round(settlementRate * 100) / 100,
        estimated_conviction_rate: Math.round(estimatedConviction * 100) / 100,
        value_at_risk: valueAtRisk,
        avg_resolution_days: avgResolutionDays,
      },
    };
  }
}

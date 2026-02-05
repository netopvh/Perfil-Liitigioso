import { CaseGenerated } from './case.generator';

export interface ScoreResult {
  value: number;
  classification: string;
  drivers: { key: string; impact: number }[];
}

export interface KpisForScore {
  newCases12m: number;
  totalCases: number;
  trabalhistaShare: number;
  settlementRate: number;
  valueAtRisk: number;
  growthRate: number;
  topSubjectReincidence: number;
}

export function computeKpisFromCases(cases: CaseGenerated[]): KpisForScore {
  const now = new Date();
  const twelveMonthsAgo = new Date(now);
  twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);

  const newCases12m = cases.filter(
    (c) => new Date(c.data_distribuicao) >= twelveMonthsAgo,
  ).length;
  const activeCases = cases.filter((c) => c.status === 'ativo').length;
  const baixados = cases.filter((c) => c.status === 'baixado');
  const comAcordo = baixados.filter((c) => c.desfecho === 'acordo').length;
  const settlementRate = baixados.length > 0 ? comAcordo / baixados.length : 0.2;
  const valueAtRisk = cases
    .filter((c) => c.status === 'ativo')
    .reduce((s, c) => s + c.valor_causa, 0);
  const trabalhistaTotal = cases.filter((c) => c.ramo === 'trabalhista').length;
  const trabalhistaShare = cases.length > 0 ? trabalhistaTotal / cases.length : 0.3;

  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const newLast6m = cases.filter(
    (c) => new Date(c.data_distribuicao) >= sixMonthsAgo,
  ).length;
  const newFirst6m = newCases12m - newLast6m;
  const growthRate =
    newFirst6m > 0 ? (newLast6m - newFirst6m) / newFirst6m : 0;

  const subjectCount: Record<string, number> = {};
  for (const c of cases) {
    for (const a of c.assuntos ?? []) {
      subjectCount[a] = (subjectCount[a] ?? 0) + 1;
    }
  }
  const maxSubject = Math.max(0, ...Object.values(subjectCount));
  const topSubjectReincidence =
    cases.length > 0 ? maxSubject / cases.length : 0;

  return {
    newCases12m,
    totalCases: cases.length,
    trabalhistaShare,
    settlementRate,
    valueAtRisk,
    growthRate,
    topSubjectReincidence,
  };
}

const MAX_VALUE_AT_RISK = 100_000_000;
const MAX_NEW_12M = 200;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function calculateScore(kpis: KpisForScore, scenario?: string): ScoreResult {
  let newCases12m = kpis.newCases12m;
  let settlementRate = kpis.settlementRate;
  let valueAtRisk = kpis.valueAtRisk;

  if (scenario === 'aggressive_settlement') {
    settlementRate = Math.min(0.7, settlementRate + 0.35);
    valueAtRisk = Math.round(valueAtRisk * 0.6);
  }

  const volumeScore = (newCases12m / MAX_NEW_12M) * 30;
  const trabalhistaScore = kpis.trabalhistaShare * 20;
  const lowSettlementScore = (1 - settlementRate) * 15;
  const valueScore = clamp(valueAtRisk / MAX_VALUE_AT_RISK, 0, 1) * 15;
  const growthScore = Math.max(0, Math.min(1, (kpis.growthRate + 0.5) / 1)) * 10;
  const reincidenceScore = clamp(kpis.topSubjectReincidence * 2, 0, 1) * 10;

  const drivers: { key: string; impact: number }[] = [
    { key: 'volume_12m', impact: clamp(volumeScore / 100, 0, 1) },
    { key: 'trabalhista_share', impact: trabalhistaScore / 100 },
    { key: 'low_settlement_rate', impact: lowSettlementScore / 100 },
    { key: 'value_at_risk', impact: valueScore / 100 },
    { key: 'growth_rate', impact: growthScore / 100 },
    { key: 'subject_reincidence', impact: reincidenceScore / 100 },
  ].sort((a, b) => b.impact - a.impact);

  const value =
    volumeScore +
    trabalhistaScore +
    lowSettlementScore +
    valueScore +
    growthScore +
    reincidenceScore;
  const normalized = Math.round(clamp(value, 0, 100));
  let classification = 'baixo';
  if (normalized >= 60) classification = 'alto';
  else if (normalized >= 35) classification = 'moderado';

  return {
    value: normalized,
    classification,
    drivers: drivers.slice(0, 5),
  };
}

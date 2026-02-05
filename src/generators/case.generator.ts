import * as seedrandomModule from 'seedrandom';

const seedrandom: (s: string) => () => number =
  typeof seedrandomModule === 'function'
    ? (seedrandomModule as unknown as (s: string) => () => number)
    : (seedrandomModule as { default: (s: string) => () => number }).default;
import { getSeed } from './seed';
import {
  formatNumeroCnj,
  getCnjSequence,
  getRamoByDistribution,
  getTribunalForRamo,
  MOVIMENTACAO_TIPOS,
} from './cnj';

const CLASSES_BY_RAMO: Record<string, string[]> = {
  consumidor: ['Ação de indenização', 'Ação de cobrança', 'Ação declaratória'],
  trabalhista: ['Reclamação trabalhista', 'Ação de rescisória', 'Execução de título extrajudicial'],
  civel: ['Ação de indenização', 'Ação de despejo', 'Ação de usucapião'],
  tributario: ['Execução fiscal', 'Mandado de segurança', 'Ação anulatória'],
};

const ASSUNTOS_BY_RAMO: Record<string, string[]> = {
  consumidor: ['cobrança indevida', 'danos morais', 'produto defeituoso', 'negativação indevida'],
  trabalhista: ['verbas rescisórias', 'horas extras', 'reconhecimento de vínculo', 'adicional'],
  civel: ['danos morais', 'indenização', 'responsabilidade civil', 'obrigação de fazer'],
  tributario: ['ICMS', 'PIS/COFINS', 'IPI', 'contribuições'],
};

function deterministicUuid(seed: number, index: number): string {
  const rng = seedrandom(`${seed}-${index}`);
  const hex = () => Math.floor(rng() * 16).toString(16);
  const segment = (n: number) => Array.from({ length: n }, hex).join('');
  return `${segment(8)}-${segment(4)}-4${segment(3)}-${['8', '9', 'a', 'b'][Math.floor(rng() * 4)]}${segment(3)}-${segment(12)}`;
}

function logNormal(rng: () => number, mu: number, sigma: number): number {
  const u = rng();
  const v = rng();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return Math.exp(mu + sigma * z);
}

export interface CaseMovementGenerated {
  tipo: string;
  data: Date;
  descricao: string | null;
}

export interface CaseGenerated {
  process_id: string;
  numero_cnj: string;
  tribunal: string;
  ramo: string;
  classe: string;
  assuntos: string[];
  polo: string;
  status: string;
  fase: string | null;
  data_distribuicao: Date;
  data_ultima_movimentacao: Date;
  valor_causa: number;
  probabilidade_condenacao: number;
  desfecho: string | null;
  custos_estimados: { min: number; max: number };
  segredo_justica: boolean;
  movimentacoes: CaseMovementGenerated[];
}

export function generateCases(cnpj: string, ufSede: string, count?: number): CaseGenerated[] {
  const normalized = cnpj.replace(/\D/g, '') || '0';
  const seed = getSeed(normalized);
  const rng = seedrandom(seed.toString());

  const total =
    count ?? Math.max(50, Math.min(900, Math.floor(rng() * 800) + 100));
  const cases: CaseGenerated[] = [];
  const now = new Date();
  const twelveMonthsAgo = new Date(now);
  twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);

  for (let i = 0; i < total; i++) {
    const caseRng = seedrandom(`${seed}-case-${i}`);
    const ramo = getRamoByDistribution(() => caseRng());
    const tribunal = getTribunalForRamo(ufSede, ramo, () => caseRng());
    const ano = twelveMonthsAgo.getFullYear() + Math.floor(caseRng() * 2);
    const seq = getCnjSequence(seed + i, i);
    const numeroCnj = formatNumeroCnj(seq, ano, ramo === 'trabalhista' ? 8 : 4, 26, 1000 + (i % 8000));

    const distDays = Math.floor(caseRng() * 800);
    const dataDistribuicao = new Date(twelveMonthsAgo);
    dataDistribuicao.setDate(dataDistribuicao.getDate() + Math.floor(caseRng() * 400));
    const ultimaDays = distDays + Math.floor(caseRng() * 400) + 30;
    const dataUltima = new Date(dataDistribuicao);
    dataUltima.setDate(dataUltima.getDate() + ultimaDays);
    if (dataUltima > now) dataUltima.setTime(now.getTime());

    const valorCausa = Math.round(
      Math.max(1000, Math.min(50_000_000, logNormal(() => caseRng(), 12, 1.5))),
    );
    const probCond = 0.2 + caseRng() * 0.5;
    const statuses = ['ativo', 'ativo', 'suspenso', 'baixado'];
    const status = statuses[Math.floor(caseRng() * statuses.length)];
    const desfechos = ['acordo', 'procedente', 'improcedente', 'parcial', null];
    const desfecho =
      status === 'baixado'
        ? desfechos[Math.floor(caseRng() * desfechos.length)]
        : null;
    const polo = caseRng() > 0.5 ? 'ré' : 'autora';
    const fases = ['conhecimento', 'execução', 'recurso', null];
    const fase = status === 'ativo' ? fases[Math.floor(caseRng() * 3)] : null;

    const classes = CLASSES_BY_RAMO[ramo] ?? CLASSES_BY_RAMO.civel;
    const assuntosList = ASSUNTOS_BY_RAMO[ramo] ?? ASSUNTOS_BY_RAMO.civel;
    const classe = classes[Math.floor(caseRng() * classes.length)];
    const numAssuntos = 1 + Math.floor(caseRng() * 2);
    const assuntos = Array.from(
      { length: numAssuntos },
      () => assuntosList[Math.floor(caseRng() * assuntosList.length)],
    );
    const uniqAssuntos = [...new Set(assuntos)];

    const segredoJustica = caseRng() < 0.08;
    const custosMin = Math.round(valorCausa * 0.02);
    const custosMax = Math.round(valorCausa * 0.08);

    const numMov = 3 + Math.floor(caseRng() * 8);
    const movimentacoes: CaseMovementGenerated[] = [];
    for (let m = 0; m < numMov; m++) {
      const movDate = new Date(dataDistribuicao);
      movDate.setDate(movDate.getDate() + Math.floor((ultimaDays * (m + 1)) / (numMov + 1)));
      movimentacoes.push({
        tipo: MOVIMENTACAO_TIPOS[Math.floor(caseRng() * MOVIMENTACAO_TIPOS.length)],
        data: movDate,
        descricao: null,
      });
    }
    movimentacoes.sort((a, b) => a.data.getTime() - b.data.getTime());

    cases.push({
      process_id: deterministicUuid(seed, i),
      numero_cnj: numeroCnj,
      tribunal,
      ramo,
      classe,
      assuntos: uniqAssuntos,
      polo,
      status,
      fase,
      data_distribuicao: dataDistribuicao,
      data_ultima_movimentacao: dataUltima,
      valor_causa: valorCausa,
      probabilidade_condenacao: probCond,
      desfecho,
      custos_estimados: { min: custosMin, max: custosMax },
      segredo_justica: segredoJustica,
      movimentacoes,
    });
  }

  return cases;
}

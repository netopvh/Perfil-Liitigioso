import * as seedrandomModule from 'seedrandom';

const seedrandom: (s: string) => () => number =
  typeof seedrandomModule === 'function'
    ? (seedrandomModule as unknown as (s: string) => () => number)
    : (seedrandomModule as { default: (s: string) => () => number }).default;

/**
 * Gera número CNJ no formato NNNNNNN-DD.AAAA.J.TR.OOOO (apenas dígitos determinísticos).
 */
export function formatNumeroCnj(
  seq: number,
  ano: number,
  segmento: number,
  tribunal: number,
  origem: number,
): string {
  const n = String(seq).padStart(7, '0').slice(-7);
  const dd = String(Math.floor(seq % 100)).padStart(2, '0');
  const aaaa = String(ano);
  const j = String(segmento);
  const tr = String(tribunal).padStart(2, '0');
  const oooo = String(origem).padStart(4, '0');
  return `${n}-${dd}.${aaaa}.${j}.${tr}.${oooo}`;
}

/**
 * Gera sequência numérica determinística para CNJ a partir do seed e índice.
 */
export function getCnjSequence(seed: number, index: number): number {
  const rng = seedrandom(`${seed}-${index}`);
  return Math.floor(rng() * 9999999) + 1;
}

const RAMOS = ['consumidor', 'trabalhista', 'civel', 'tributario'] as const;
const RAMO_DISTRIBUTION = [0.5, 0.3, 0.15, 0.05]; // consumidor, trabalhista, civel, tributario

export function getRamoByDistribution(rng: () => number): (typeof RAMOS)[number] {
  const p = rng();
  let acc = 0;
  for (let i = 0; i < RAMO_DISTRIBUTION.length; i++) {
    acc += RAMO_DISTRIBUTION[i];
    if (p < acc) return RAMOS[i];
  }
  return RAMOS[0];
}

const TRIBUNAL_BY_UF: Record<string, string[]> = {
  SP: ['TJSP', 'TRT2', 'TRF3'],
  MG: ['TJMG', 'TRT3', 'TRF1'],
  RJ: ['TJRJ', 'TRT1', 'TRF2'],
  RS: ['TJRS', 'TRT4', 'TRF4'],
  PR: ['TJPR', 'TRT9', 'TRF4'],
  SC: ['TJSC', 'TRT12', 'TRF4'],
  BA: ['TJBA', 'TRT5', 'TRF1'],
  PE: ['TJPE', 'TRT6', 'TRF5'],
  CE: ['TJCE', 'TRT7', 'TRF5'],
  GO: ['TJGO', 'TRT18', 'TRF1'],
  DF: ['TJDFT', 'TRT10', 'TRF1'],
  ES: ['TJES', 'TRT17', 'TRF2'],
  MT: ['TJMT', 'TRT23', 'TRF1'],
  MS: ['TJMS', 'TRT24', 'TRF3'],
  PA: ['TJPA', 'TRT8', 'TRF1'],
  RN: ['TJRN', 'TRT21', 'TRF5'],
  PB: ['TJPB', 'TRT13', 'TRF5'],
  AL: ['TJAL', 'TRT19', 'TRF5'],
  SE: ['TJSE', 'TRT20', 'TRF5'],
  MA: ['TJMA', 'TRT16', 'TRF1'],
  PI: ['TJPI', 'TRT22', 'TRF5'],
  RO: ['TJRO', 'TRT14', 'TRF1'],
  TO: ['TJTO', 'TRT23', 'TRF1'],
  AM: ['TJAM', 'TRT11', 'TRF1'],
  AP: ['TJAP', 'TRT8', 'TRF1'],
  RR: ['TJRR', 'TRT11', 'TRF1'],
  AC: ['TJAC', 'TRT14', 'TRF1'],
};

export function getTribunalForRamo(uf: string, ramo: string, rng: () => number): string {
  const list = TRIBUNAL_BY_UF[uf] ?? TRIBUNAL_BY_UF['SP'];
  if (ramo === 'trabalhista' && list.length >= 2) return list[1];
  if (ramo === 'tributario' && list.length >= 3) return list[2];
  return list[0];
}

export const MOVIMENTACAO_TIPOS = [
  'Distribuição',
  'Citação',
  'Juntada de documentos',
  'Audiência designada',
  'Sentença',
  'Recurso interposto',
  'Despacho',
  'Decisão interlocutória',
  'Conclusão ao juízo',
  'Baixa',
];

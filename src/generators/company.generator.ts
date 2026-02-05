import { faker } from '@faker-js/faker';
import * as seedrandomModule from 'seedrandom';
import { getSeed, getSeedFromString } from './seed';

const seedrandom: (s: string) => () => number =
  typeof seedrandomModule === 'function'
    ? (seedrandomModule as unknown as (s: string) => () => number)
    : (seedrandomModule as { default: (s: string) => () => number }).default;

const SETORES = [
  'varejo',
  'serviços',
  'indústria',
  'tecnologia',
  'construção',
  'alimentício',
  'logística',
  'financeiro',
  'saúde',
  'educação',
];

const PORTES = ['MEI', 'ME', 'EPP', 'Médio', 'Grande'];

const UFS = [
  'SP', 'MG', 'RJ', 'RS', 'PR', 'SC', 'BA', 'PE', 'CE', 'GO', 'DF', 'ES', 'MT', 'MS', 'PA', 'RN', 'PB', 'AL', 'SE', 'MA', 'PI', 'RO', 'TO', 'AM', 'AP', 'RR', 'AC',
];

export interface CompanyGenerated {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  setor: string;
  porte: string;
  uf_sede: string;
}

function normalizeCnpj(cnpj: string): string {
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) {
    return digits.padStart(14, '0').slice(-14);
  }
  return digits;
}

function formatCnpj(digits: string): string {
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

export function generateCompany(cnpj: string): CompanyGenerated {
  const normalized = normalizeCnpj(cnpj);
  const seed = getSeed(normalized);
  const rng = seedrandom(seed.toString());
  faker.seed(seed);

  const razao = faker.company.name().toUpperCase() + ' LTDA';
  const nomeFantasia = rng() > 0.3 ? faker.company.name() : null;
  const setor = SETORES[Math.floor(rng() * SETORES.length)];
  const porte = PORTES[Math.floor(rng() * PORTES.length)];
  const uf = UFS[Math.floor(rng() * UFS.length)];

  return {
    cnpj: formatCnpj(normalized),
    razao_social: razao,
    nome_fantasia: nomeFantasia,
    setor,
    porte,
    uf_sede: uf,
  };
}

/**
 * Gera várias empresas para busca por query (ex.: 1-5 com nome que contenha o termo).
 */
export function generateCompaniesForQuery(query: string, limit: number = 5): CompanyGenerated[] {
  const seed = getSeedFromString(query);
  const rng = seedrandom(seed.toString());
  faker.seed(seed);
  const count = Math.min(limit, Math.max(1, Math.floor(rng() * 4) + 1));
  const companies: CompanyGenerated[] = [];
  const usedSeeds = new Set<number>();

  for (let i = 0; i < count; i++) {
    const s = seed + i * 7919;
    if (usedSeeds.has(s)) continue;
    usedSeeds.add(s);
    const subRng = seedrandom(s.toString());
    faker.seed(s);
    const razao = faker.company.name().toUpperCase() + ' LTDA';
    const normalized = String(s).padStart(14, '0').slice(-14);
    companies.push({
      cnpj: formatCnpj(normalized),
      razao_social: razao,
      nome_fantasia: subRng() > 0.3 ? faker.company.name() : null,
      setor: SETORES[Math.floor(subRng() * SETORES.length)],
      porte: PORTES[Math.floor(subRng() * PORTES.length)],
      uf_sede: UFS[Math.floor(subRng() * UFS.length)],
    });
  }
  return companies;
}

import { createHash } from 'crypto';

/**
 * Normaliza CNPJ para apenas dígitos e gera semente numérica determinística.
 */
export function getSeed(cnpj: string): number {
  const digits = cnpj.replace(/\D/g, '');
  const hash = createHash('sha256').update(digits || '0').digest();
  return hash.readUInt32BE(0);
}

/**
 * Gera um segundo valor de seed a partir de uma string (ex: query de busca).
 */
export function getSeedFromString(str: string): number {
  const hash = createHash('sha256').update(str || '0').digest();
  return hash.readUInt32BE(4);
}

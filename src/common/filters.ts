export interface CaseFilterParams {
  ramo?: string;
  status?: string;
  tribunal?: string;
  from?: string;
  to?: string;
}

export interface CaseFilters {
  ramo?: string;
  status?: string;
  tribunal?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export function parseCaseFilters(params: CaseFilterParams): CaseFilters {
  const filters: CaseFilters = {};
  if (params.ramo) filters.ramo = params.ramo;
  if (params.status) filters.status = params.status;
  if (params.tribunal) filters.tribunal = params.tribunal;
  if (params.from) filters.dateFrom = new Date(params.from);
  if (params.to) filters.dateTo = new Date(params.to);
  return filters;
}

export function hashFilters(params: CaseFilterParams): string {
  const parts = [
    params.ramo ?? '',
    params.status ?? '',
    params.tribunal ?? '',
    params.from ?? '',
    params.to ?? '',
  ];
  return parts.join('|');
}

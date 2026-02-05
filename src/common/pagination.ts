export interface PaginationResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function paginate<T>(
  items: T[],
  page: number,
  limit: number,
): PaginationResult<T> {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const p = Math.max(1, Math.min(page, totalPages));
  const skip = (p - 1) * limit;
  const data = items.slice(skip, skip + limit);
  return {
    data,
    total,
    page: p,
    limit,
    totalPages,
  };
}

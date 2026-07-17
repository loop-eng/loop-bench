export interface PaginationResult<T> {
  data: T[];
  total: number;
  totalPages: number;
  currentPage: number;
}

/**
 * Paginate an array of items.
 * Page numbers are 1-indexed (first page is page 1).
 */
export function paginate<T>(
  items: T[],
  page: number,
  pageSize: number
): PaginationResult<T> {
  const total = items.length;
  const totalPages = Math.ceil(total / pageSize);

  // BUG: uses page * pageSize instead of (page - 1) * pageSize
  const start = page * pageSize;
  const end = (page + 1) * pageSize;
  const data = items.slice(start, end);

  return {
    data,
    total,
    totalPages,
    currentPage: page,
  };
}

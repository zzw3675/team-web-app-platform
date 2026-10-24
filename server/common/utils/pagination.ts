export interface PaginationParams {
  page: number;
  pageSize: number;
  offset: number;
}

export function parsePagination(
  page?: string,
  pageSize?: string,
  defaultPageSize = 20,
  maxPageSize = 100,
): PaginationParams {
  const parsedPage = parseInt(page ?? '', 10);
  const parsedPageSize = parseInt(pageSize ?? '', 10);

  const pageNum = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const rawPageSize =
    Number.isFinite(parsedPageSize) && parsedPageSize > 0
      ? parsedPageSize
      : defaultPageSize;
  const pageSizeNum = Math.min(rawPageSize, maxPageSize);

  return {
    page: pageNum,
    pageSize: pageSizeNum,
    offset: (pageNum - 1) * pageSizeNum,
  };
}

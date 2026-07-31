export interface ApiError {
  error: string;
  code?: string;
  details?: unknown;
}

export interface ApiResult<T> {
  data: T | null;
  error: ApiError | null;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

interface ErrorBody {
  readonly error: { readonly code: string; readonly message: string; readonly retryAfter?: number };
}

const isErrorBody = (body: unknown): body is ErrorBody => {
  if (typeof body !== 'object' || body === null || !('error' in body)) {
    return false;
  }
  const { error } = body;
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string' &&
    'message' in error &&
    typeof error.message === 'string'
  );
};

/**
 * A request OrcaSonar refused or never answered. `code` is OrcaSonar's error code, such as `forbidden` or
 * `over-budget`; `status` is 0 when no response arrived.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  /** Seconds until a retry can succeed, for `over-budget` and `throttled`. */
  readonly retryAfter: number | undefined;

  constructor(status: number, code: string, message: string, retryAfter?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
  }

  /** From an error response and its parsed body, in OrcaSonar's `{"error": {code, message, retryAfter?}}` shape. */
  static fromResponse(response: Response, body: unknown): ApiError {
    const error = isErrorBody(body) ? body.error : undefined;
    const header = Number(response.headers.get('Retry-After'));
    return new ApiError(
      response.status,
      error?.code ?? `http-${response.status}`,
      error?.message ?? `OrcaSonar answered ${response.status} ${response.statusText}`.trim(),
      error?.retryAfter ?? (Number.isFinite(header) && header > 0 ? header : undefined)
    );
  }

  /** For a request that got no response: offline, blocked, or the API is down. */
  static network(cause: unknown): ApiError {
    const error = new ApiError(0, 'network', "Couldn't reach OrcaSonar.");
    error.cause = cause;
    return error;
  }
}

export const isApiError = (error: unknown): error is ApiError => error instanceof ApiError;

export const isAbort = (error: unknown): boolean =>
  error instanceof DOMException && error.name === 'AbortError';

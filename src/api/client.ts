import createClient from 'openapi-fetch';
import { idToken } from '@/auth/session';
import { API_BASE_URL } from '@/lib/stage';
import { ApiError, isAbort } from './errors';
import type { paths } from './schema';

/** OrcaSonar's API, typed from its OpenAPI contract (`pnpm api:types`), with the reader's ID token on each request. */
export const api = createClient<paths>({ baseUrl: API_BASE_URL ?? '/api/v1' });

api.use({
  async onRequest({ request }) {
    const token = await idToken();
    if (token) {
      request.headers.set('Authorization', `Bearer ${token}`);
    }
    return request;
  },
});

type Result<T> = { data?: T; error?: unknown; response: Response };

const settle = async <T>(request: Promise<Result<T>>): Promise<Result<T>> => {
  try {
    return await request;
  } catch (error) {
    throw isAbort(error) || error instanceof ApiError ? error : ApiError.network(error);
  }
};

/** The response body of a request that succeeded; anything else is thrown as an {@link ApiError}. */
export const unwrap = async <T>(request: Promise<Result<T>>): Promise<T> => {
  const { data, error, response } = await settle(request);
  if (!response.ok || error !== undefined) {
    throw ApiError.fromResponse(response, error);
  }
  if (data === undefined) {
    throw new ApiError(response.status, 'empty', 'OrcaSonar sent an empty response.');
  }
  return data;
};

/** For a request that returns nothing, such as `204 No Content`. */
export const expectOk = async (request: Promise<Result<unknown>>): Promise<void> => {
  const { error, response } = await settle(request);
  if (!response.ok) {
    throw ApiError.fromResponse(response, error);
  }
};

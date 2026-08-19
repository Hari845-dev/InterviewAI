/**
 * InterviewAI API client.
 *
 * Supports:
 * - Bearer authentication
 * - configurable backend URL
 * - request timeouts
 * - caller-controlled cancellation
 * - clean API error handling
 */

const ENV_BACKEND_URL =
  (
    import.meta.env.VITE_API_URL as
      | string
      | undefined
  )?.trim() || '';

const DEFAULT_BACKEND_URL =
  ENV_BACKEND_URL ||
  'http://localhost:8000';


function normalizeBaseUrl(
  url: string
): string {
  return url
    .trim()
    .replace(/\/+$/, '');
}


export function getBaseApiUrl(): string {
  if (typeof window !== 'undefined') {
    const custom =
      localStorage.getItem(
        'interviewai_custom_api_url'
      );

    if (
      custom &&
      custom.trim()
    ) {
      return normalizeBaseUrl(
        custom
      );
    }
  }

  return normalizeBaseUrl(
    DEFAULT_BACKEND_URL
  );
}


export function setCustomApiUrl(
  url: string | null
): void {
  if (
    typeof window === 'undefined'
  ) {
    return;
  }

  if (
    url &&
    url.trim()
  ) {
    localStorage.setItem(
      'interviewai_custom_api_url',
      normalizeBaseUrl(url)
    );
  } else {
    localStorage.removeItem(
      'interviewai_custom_api_url'
    );
  }
}


export function getStoredToken():
  string | null {
  if (
    typeof window === 'undefined'
  ) {
    return null;
  }

  return localStorage.getItem(
    'interviewai_token'
  );
}


export function setStoredToken(
  token: string | null
): void {
  if (
    typeof window === 'undefined'
  ) {
    return;
  }

  if (token) {
    localStorage.setItem(
      'interviewai_token',
      token
    );
  } else {
    localStorage.removeItem(
      'interviewai_token'
    );
  }
}


export interface RequestOptions
  extends RequestInit {
  timeout?: number;
  skipAuth?: boolean;
}


export interface ErrorData {
  detail?: string | string[];
  message?: string;
  [key: string]: unknown;
}


export class ApiError
  extends Error {
  status: number;
  data?: ErrorData;

  constructor(
    message: string,
    status: number,
    data?: ErrorData
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}


function buildRequestUrl(
  endpoint: string
): string {
  if (
    endpoint.startsWith(
      'http://'
    ) ||
    endpoint.startsWith(
      'https://'
    )
  ) {
    return endpoint;
  }

  const baseUrl =
    getBaseApiUrl();

  const normalizedEndpoint =
    endpoint.startsWith('/')
      ? endpoint
      : `/${endpoint}`;

  return `${baseUrl}${normalizedEndpoint}`;
}


function extractErrorMessage(
  errorData:
    | ErrorData
    | undefined,
  status: number
): string {
  if (
    errorData?.detail
  ) {
    if (
      Array.isArray(
        errorData.detail
      )
    ) {
      return errorData.detail
        .map(
          (
            item: unknown
          ) => {
            if (
              typeof item ===
                'object' &&
              item !== null &&
              'msg' in item
            ) {
              return String(
                (
                  item as {
                    msg: unknown;
                  }
                ).msg
              );
            }

            return String(
              item
            );
          }
        )
        .join(', ');
    }

    return String(
      errorData.detail
    );
  }

  if (
    errorData?.message
  ) {
    return String(
      errorData.message
    );
  }

  return `Request failed with status ${status}`;
}


export async function apiFetch<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const url =
    buildRequestUrl(
      endpoint
    );

  const timeoutMs =
    options.timeout ??
    15000;

  const controller =
    new AbortController();

  const timeoutId =
    window.setTimeout(
      () => {
        controller.abort();
      },
      timeoutMs
    );

  const callerSignal =
    options.signal;

  let callerAbortHandler:
    | (() => void)
    | undefined;


  if (
    callerSignal
  ) {
    if (
      callerSignal.aborted
    ) {
      controller.abort();
    } else {
      callerAbortHandler =
        () => {
          controller.abort();
        };

      callerSignal.addEventListener(
        'abort',
        callerAbortHandler,
        {
          once: true,
        }
      );
    }
  }


  const headers =
    new Headers(
      options.headers ||
        {}
    );


  if (
    !options.skipAuth
  ) {
    const token =
      getStoredToken();

    if (token) {
      headers.set(
        'Authorization',
        `Bearer ${token}`
      );
    }
  }


  if (
    options.body &&
    !(
      options.body
      instanceof FormData
    ) &&
    !headers.has(
      'Content-Type'
    )
  ) {
    headers.set(
      'Content-Type',
      'application/json'
    );
  }


  try {
    const response =
      await fetch(
        url,
        {
          ...options,
          signal:
            controller.signal,
          headers,
        }
      );


    if (
      !response.ok
    ) {
      let errorData:
        | ErrorData
        | undefined;


      try {
        errorData =
          await response.json();
      } catch {
        try {
          const text =
            await response.text();

          errorData = {
            detail: text,
          };
        } catch {
          errorData =
            undefined;
        }
      }


      throw new ApiError(
        extractErrorMessage(
          errorData,
          response.status
        ),
        response.status,
        errorData
      );
    }


    if (
      response.status ===
      204
    ) {
      return {} as T;
    }


    const contentType =
      response.headers.get(
        'content-type'
      ) || '';


    if (
      !contentType.includes(
        'application/json'
      )
    ) {
      return {} as T;
    }


    return await response.json();

  } catch (
    error: unknown
  ) {

    if (
      callerSignal?.aborted
    ) {
      throw new ApiError(
        'Request cancelled.',
        499
      );
    }


    if (
      error instanceof
      DOMException &&
      error.name ===
        'AbortError'
    ) {
      throw new ApiError(
        'Request timed out. Please check that the backend server is running.',
        408
      );
    }


    if (
      error instanceof Error &&
      error.name ===
        'AbortError'
    ) {
      throw new ApiError(
        'Request timed out. Please check that the backend server is running.',
        408
      );
    }


    if (
      error instanceof
      ApiError
    ) {
      throw error;
    }


    const message =
      error instanceof Error
        ? error.message
        : 'Unable to connect to backend server.';


    throw new ApiError(
      message ||
        'Unable to connect to backend server.',
      0
    );

  } finally {

    window.clearTimeout(
      timeoutId
    );


    if (
      callerSignal &&
      callerAbortHandler
    ) {
      callerSignal.removeEventListener(
        'abort',
        callerAbortHandler
      );
    }
  }
}
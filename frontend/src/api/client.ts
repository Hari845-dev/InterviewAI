/**
 * InterviewAI API client.
 *
 * Supports:
 * - Bearer authentication
 * - configurable backend URL
 * - request timeouts
 * - caller-controlled AbortSignal cancellation
 * - clean distinction between user cancellation and timeout
 */

const DEFAULT_BACKEND_URL =
  (import.meta.env.VITE_API_URL as string | undefined)?.trim() ||
  'http://localhost:8000';

export function getBaseApiUrl(): string {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem(
      'interviewai_custom_api_url'
    );

    if (custom && custom.trim()) {
      return custom.trim().replace(/\/+$/, '');
    }
  }

  return DEFAULT_BACKEND_URL.replace(/\/+$/, '');
}

export function setCustomApiUrl(
  url: string | null
): void {
  if (typeof window !== 'undefined') {
    if (url && url.trim()) {
      localStorage.setItem(
        'interviewai_custom_api_url',
        url.trim()
      );
    } else {
      localStorage.removeItem(
        'interviewai_custom_api_url'
      );
    }
  }
}

export function getStoredToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(
      'interviewai_token'
    );
  }

  return null;
}

export function setStoredToken(
  token: string | null
): void {
  if (typeof window !== 'undefined') {
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

export class ApiError extends Error {
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

/**
 * Perform an HTTP request with:
 *
 * - automatic Authorization header
 * - automatic JSON Content-Type
 * - timeout protection
 * - caller cancellation
 */
export async function apiFetch<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const baseUrl = getBaseApiUrl();

  const url = endpoint.startsWith('http')
    ? endpoint
    : `${baseUrl}${
        endpoint.startsWith('/')
          ? ''
          : '/'
      }${endpoint}`;

  const timeoutMs =
    options.timeout ?? 15000;

  /*
   * ==========================================================
   * REQUEST CANCELLATION
   * ==========================================================
   *
   * We use our own controller internally because we need to
   * support BOTH:
   *
   * 1. automatic timeout
   * 2. explicit caller cancellation
   */
  const internalController =
    new AbortController();

  const timeoutTimer =
    window.setTimeout(() => {
      internalController.abort();
    }, timeoutMs);

  const callerSignal =
    options.signal;

  let callerAbortHandler:
    | (() => void)
    | undefined;

  /*
   * Connect caller signal -> internal controller.
   */
  if (callerSignal) {
    if (callerSignal.aborted) {
      internalController.abort();
    } else {
      callerAbortHandler = () => {
        internalController.abort();
      };

      callerSignal.addEventListener(
        'abort',
        callerAbortHandler,
        { once: true }
      );
    }
  }

  const headers =
    new Headers(
      options.headers || {}
    );

  /*
   * ==========================================================
   * AUTH
   * ==========================================================
   */

  if (!options.skipAuth) {
    const token =
      getStoredToken();

    if (token) {
      headers.set(
        'Authorization',
        `Bearer ${token}`
      );
    }
  }

  /*
   * ==========================================================
   * CONTENT TYPE
   * ==========================================================
   *
   * Never set application/json for FormData.
   */
  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has('Content-Type')
  ) {
    headers.set(
      'Content-Type',
      'application/json'
    );
  }

  try {
    const response =
      await fetch(url, {
        ...options,

        /*
         * Override the caller signal with the internal signal.
         * The caller signal is bridged to this controller above.
         */
        signal:
          internalController.signal,

        headers,
      });

    if (!response.ok) {
      let errorData:
        | ErrorData
        | undefined;

      try {
        errorData =
          await response.json();
      } catch {
        try {
          errorData = {
            detail:
              await response.text(),
          };
        } catch {
          errorData = undefined;
        }
      }

      let errorMessage =
        'Request failed';

      if (errorData?.detail) {
        errorMessage =
          Array.isArray(
            errorData.detail
          )
            ? errorData.detail
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

                    return String(item);
                  }
                )
                .join(', ')
            : String(
                errorData.detail
              );
      } else if (
        errorData?.message
      ) {
        errorMessage =
          String(
            errorData.message
          );
      } else {
        errorMessage =
          `Request failed with status ${response.status}`;
      }

      throw new ApiError(
        errorMessage,
        response.status,
        errorData
      );
    }

    if (
      response.status === 204
    ) {
      return {} as T;
    }

    /*
     * Some successful endpoints may return an empty body.
     */
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

  } catch (error: unknown) {
    /*
     * ========================================================
     * USER CANCELLATION
     * ========================================================
     *
     * Check callerSignal BEFORE checking generic AbortError.
     *
     * This prevents a user cancellation from being reported
     * as a timeout.
     */
    if (
      callerSignal?.aborted
    ) {
      throw new ApiError(
        'Upload cancelled.',
        499
      );
    }

    /*
     * ========================================================
     * TIMEOUT
     * ========================================================
     */
    if (
      error instanceof DOMException &&
      error.name === 'AbortError'
    ) {
      throw new ApiError(
        'Request timed out. Please check if the FastAPI server is running.',
        408
      );
    }

    if (
      error instanceof Error &&
      error.name === 'AbortError'
    ) {
      throw new ApiError(
        'Request timed out. Please check if the FastAPI server is running.',
        408
      );
    }

    /*
     * ========================================================
     * API ERROR
     * ========================================================
     */
    if (
      error instanceof ApiError
    ) {
      throw error;
    }

    const message =
      error instanceof Error
        ? error.message
        : 'Unable to connect to backend server';

    throw new ApiError(
      message ||
        'Unable to connect to backend server. Make sure the FastAPI service is running.',
      0
    );

  } finally {
    window.clearTimeout(
      timeoutTimer
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
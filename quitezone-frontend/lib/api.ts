import Constants from "expo-constants";
import { Platform } from "react-native";

type ApiRequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
};

export type ApiError = Error & {
  status?: number;
  code?: string;
  details?: unknown;
  isNetworkError?: boolean;
  isTimeout?: boolean;
};

function normalizeBaseUrl(url: string) {
  return url.replace(/\/+$/, "");
}

export function getApiBaseUrl() {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configured) {
    return normalizeBaseUrl(configured);
  }

  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri?.split(":")[0];
  if (host) {
    return `http://${host}:4000`;
  }

  if (Platform.OS === "android") {
    return "http://10.0.2.2:4000";
  }

  return "http://127.0.0.1:4000";
}

function isLikelyNetworkFailure(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }
  const message = error.message.toLowerCase();
  return (
    message.includes("network request failed") ||
    message.includes("failed to fetch") ||
    message.includes("networkerror")
  );
}

function attachAbortTimeout(signal: AbortSignal | undefined, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort(new Error("Request timeout"));
  }, timeoutMs);

  const abortFromCaller = () => {
    controller.abort(new Error("Request aborted"));
  };

  if (signal) {
    signal.addEventListener("abort", abortFromCaller, { once: true });
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timeout);
      if (signal) {
        signal.removeEventListener("abort", abortFromCaller);
      }
    },
  };
}

function toApiError(message: string, partial: Partial<ApiError> = {}) {
  const error = new Error(message) as ApiError;
  Object.assign(error, partial);
  return error;
}

export function getUserFacingError(error: unknown) {
  if (error && typeof error === "object" && "isTimeout" in error && (error as ApiError).isTimeout) {
    return "Request timed out. Check your connection and try again.";
  }

  if (error && typeof error === "object" && "isNetworkError" in error && (error as ApiError).isNetworkError) {
    return "Cannot reach the backend. Check EXPO_PUBLIC_API_URL and your network.";
  }

  if (error && typeof error === "object" && "status" in error && (error as ApiError).status === 401) {
    return "Your session expired. Sign in again.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong";
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}) {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const requestInit = {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  };

  const maxAttempts = (options.method ?? "GET") === "GET" ? 2 : 1;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const timeoutHandle = attachAbortTimeout(options.signal, 12000);

    try {
      const response = await fetch(`${getApiBaseUrl()}${path}`, {
        ...requestInit,
        signal: timeoutHandle.signal,
      });

      const contentType = response.headers.get("content-type") || "";
      const isJson = contentType.includes("application/json");
      const payload = isJson ? await response.json() : await response.text();

      if (!response.ok) {
        const message =
          typeof payload === "object" && payload && "message" in payload
            ? String(payload.message)
            : `Request failed with status ${response.status}`;
        const code =
          typeof payload === "object" && payload && "code" in payload
            ? String(payload.code)
            : `HTTP_${response.status}`;
        throw toApiError(message, {
          status: response.status,
          code,
          details: payload,
        });
      }

      return payload as T;
    } catch (error) {
      const isTimeout = error instanceof Error && error.name === "AbortError";
      const networkError = isLikelyNetworkFailure(error);
      const apiError = error as ApiError;
      if (isTimeout || networkError) {
        lastError = toApiError(
          isTimeout ? "Request timed out" : "Network request failed",
          {
            code: isTimeout ? "NETWORK_TIMEOUT" : "NETWORK_UNREACHABLE",
            isTimeout,
            isNetworkError: networkError,
          }
        );
        if (attempt < maxAttempts) {
          continue;
        }
      } else {
        lastError = apiError;
      }
    } finally {
      timeoutHandle.cleanup();
    }
  }

  throw lastError instanceof Error ? lastError : toApiError("Request failed");
}

import Constants from "expo-constants";
import { Platform } from "react-native";

import type { NotificationDefaults } from "./quietzone-types";
import { loadStoredSession, saveStoredSession } from "@/lib/session-storage";

type ApiRequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
  bypassTokenRefresh?: boolean;
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

async function refreshAccessToken(): Promise<string | null> {
  try {
    const session = await loadStoredSession();
    if (!session?.refreshToken) {
      return null;
    }

    const response = await fetch(`${getApiBaseUrl()}/api/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    });

    if (!response.ok) {
      return null;
    }

    const newTokens = (await response.json()) as {
      accessToken?: string;
      refreshToken?: string;
    };
    if (!newTokens.accessToken || !newTokens.refreshToken) {
      return null;
    }

    await saveStoredSession({
      accessToken: newTokens.accessToken,
      refreshToken: newTokens.refreshToken,
    });

    return newTokens.accessToken;
  } catch {
    return null;
  }
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
  let tokenWasRefreshed = false;

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

        // Handle 401 by attempting token refresh (once per request)
        if (
          response.status === 401 &&
          options.token &&
          !options.bypassTokenRefresh &&
          !tokenWasRefreshed
        ) {
          tokenWasRefreshed = true;
          const newToken = await refreshAccessToken();

          if (newToken) {
            // Retry with new token
            return apiRequest(path, {
              ...options,
              token: newToken,
              bypassTokenRefresh: true,
            });
          }
        }

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

export async function getAuthPreferences(token: string) {
  return apiRequest<{ notificationDefaults: NotificationDefaults }>("/api/auth/preferences", {
    token,
  });
}

export async function updateAuthPreferences(
  token: string,
  notificationDefaults: Partial<NotificationDefaults>
) {
  return apiRequest<{ notificationDefaults: NotificationDefaults }>("/api/auth/preferences", {
    method: "PATCH",
    token,
    body: {
      notificationDefaults,
    },
  });
}

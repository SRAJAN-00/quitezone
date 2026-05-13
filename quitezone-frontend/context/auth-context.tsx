import { PropsWithChildren, createContext, useContext, useEffect, useState } from "react";

import {
  apiRequest,
  getApiBaseUrl,
  getAuthPreferences,
  getUserFacingError,
  updateAuthPreferences,
} from "@/lib/api";
import { AuthUser, NotificationDefaults } from "@/lib/quietzone-types";
import {
  startSilentAutomationMonitoring,
  stopSilentAutomationMonitoring,
  syncGeofencesFromApi,
} from "@/lib/silent-automation/geofence-runtime";
import { registerDevicePushToken } from "@/lib/notifications/push-registration";
import {
  StoredSession,
  clearStoredSession,
  loadStoredSession,
  saveStoredSession,
} from "@/lib/session-storage";

type AuthResponse = {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
};

type RefreshResponse = {
  accessToken: string;
  refreshToken: string;
};

type AuthContextValue = {
  accessToken: string | null;
  apiBaseUrl: string;
  authBusy: boolean;
  clearError: () => void;
  error: string;
  isAuthenticated: boolean;
  isHydrating: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  register: (email: string, password: string) => Promise<boolean>;
  saveNotificationDefaults: (defaults: Partial<NotificationDefaults>) => Promise<boolean>;
  user: AuthUser | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const DEFAULT_NOTIFICATION_DEFAULTS: NotificationDefaults = {
  enabled: true,
  notifyOnEnter: true,
  notifyOnExit: true,
  onlyOnFailure: false,
};

function normalizeNotificationDefaults(
  defaults: Partial<NotificationDefaults> | null | undefined
): NotificationDefaults {
  return {
    enabled: defaults?.enabled ?? DEFAULT_NOTIFICATION_DEFAULTS.enabled,
    notifyOnEnter: defaults?.notifyOnEnter ?? DEFAULT_NOTIFICATION_DEFAULTS.notifyOnEnter,
    notifyOnExit: defaults?.notifyOnExit ?? DEFAULT_NOTIFICATION_DEFAULTS.notifyOnExit,
    onlyOnFailure: defaults?.onlyOnFailure ?? DEFAULT_NOTIFICATION_DEFAULTS.onlyOnFailure,
  };
}

async function fetchProfile(accessToken: string) {
  const response = await apiRequest<{ user: AuthUser }>("/api/auth/me", {
    token: accessToken,
  });

  return {
    ...response.user,
    notificationDefaults: normalizeNotificationDefaults(
      response.user.notificationDefaults
    ),
  };
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [apiBaseUrl] = useState(getApiBaseUrl);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [isHydrating, setIsHydrating] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!error) {
      return;
    }

    const timer = setTimeout(() => {
      setError("");
    }, 5000);

    return () => clearTimeout(timer);
  }, [error]);

  useEffect(() => {
    void restoreSession();
  }, []);

  useEffect(() => {
    let active = true;

    async function syncAutomation() {
      try {
        if (!accessToken) {
          await stopSilentAutomationMonitoring();
          return;
        }

        await startSilentAutomationMonitoring(accessToken);
        await syncGeofencesFromApi(accessToken);
      } catch {
        if (active) {
          setError("Automation setup needs attention. Check permissions in Home.");
        }
        return;
      }

      try {
        const pushRegistration = await registerDevicePushToken(accessToken);
        if (!pushRegistration.registered && active && pushRegistration.reason) {
          if (!pushRegistration.reason.includes("not installed")) {
            setError(pushRegistration.reason);
          }
        }
      } catch {
        if (active) {
          setError("Push notifications could not be enabled.");
        }
      }
    }

    void syncAutomation();

    return () => {
      active = false;
    };
  }, [accessToken]);

  async function applySession(session: StoredSession, nextUser?: AuthUser) {
    setAccessToken(session.accessToken);
    setRefreshToken(session.refreshToken);
    if (nextUser) {
      const preferences = await getAuthPreferences(session.accessToken).catch(
        () => null
      );
      setUser({
        ...nextUser,
        notificationDefaults: normalizeNotificationDefaults(
          preferences?.notificationDefaults ?? nextUser.notificationDefaults
        ),
      });
    } else {
      const profile = await fetchProfile(session.accessToken);
      setUser(profile);
    }
    await saveStoredSession(session);
  }

  async function clearSession() {
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    await clearStoredSession();
  }

  async function tryRefresh(existingRefreshToken: string) {
    const tokens = await apiRequest<RefreshResponse>("/api/auth/refresh", {
      method: "POST",
      body: {
        refreshToken: existingRefreshToken,
      },
    });

    const refreshedSession = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
    await applySession(refreshedSession);
    return true;
  }

  async function restoreSession() {
    setIsHydrating(true);

    try {
      const stored = await loadStoredSession();
      if (!stored) {
        return;
      }

      try {
        await applySession(stored);
      } catch {
        if (!stored.refreshToken) {
          await clearSession();
          return;
        }

        try {
          await tryRefresh(stored.refreshToken);
        } catch {
          await clearSession();
        }
      }
    } finally {
      setIsHydrating(false);
    }
  }

  async function handleAuth(path: "/api/auth/login" | "/api/auth/register", email: string, password: string) {
    setAuthBusy(true);
    setError("");

    try {
      const response = await apiRequest<AuthResponse>(path, {
        method: "POST",
        body: { email, password },
      });

      await applySession(
        {
          accessToken: response.accessToken,
          refreshToken: response.refreshToken,
        },
        response.user
      );

      return true;
    } catch (error) {
      setError(getUserFacingError(error));
      return false;
    } finally {
      setAuthBusy(false);
    }
  }

  async function login(email: string, password: string) {
    return handleAuth("/api/auth/login", email, password);
  }

  async function register(email: string, password: string) {
    return handleAuth("/api/auth/register", email, password);
  }

  async function refreshProfile() {
    if (!accessToken) {
      return;
    }

    try {
      const profile = await fetchProfile(accessToken);
      setUser(profile);
    } catch (error) {
      if (!refreshToken) {
        setError(getUserFacingError(error));
        await clearSession();
        return;
      }

      try {
        await tryRefresh(refreshToken);
      } catch (refreshError) {
        setError(getUserFacingError(refreshError));
        await clearSession();
      }
    }
  }

  async function logout() {
    const currentRefreshToken = refreshToken;

    try {
      if (currentRefreshToken) {
        await apiRequest("/api/auth/logout", {
          method: "POST",
          body: {
            refreshToken: currentRefreshToken,
          },
        });
      }
    } catch {
      // Logout should always clear local session even if the backend is unavailable.
    } finally {
      setError("");
      await clearSession();
    }
  }

  async function saveNotificationDefaults(defaults: Partial<NotificationDefaults>) {
    if (!accessToken || !user) {
      return false;
    }

    try {
      const response = await updateAuthPreferences(accessToken, defaults);
      setUser((currentUser) =>
        currentUser
          ? {
              ...currentUser,
              notificationDefaults: normalizeNotificationDefaults(
                response.notificationDefaults
              ),
            }
          : currentUser
      );
      return true;
    } catch (error) {
      setError(getUserFacingError(error));
      return false;
    }
  }

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        apiBaseUrl,
        authBusy,
        clearError: () => setError(""),
        error,
        isAuthenticated: Boolean(accessToken && user),
        isHydrating,
        login,
        logout,
        refreshProfile,
        register,
        saveNotificationDefaults,
        user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}

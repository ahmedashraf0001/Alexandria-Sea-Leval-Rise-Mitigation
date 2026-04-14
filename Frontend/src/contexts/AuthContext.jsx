import React, { useCallback, useEffect, useMemo, useState } from "react";
import { dataService } from "../services/dataService";
import { AuthContext } from "./authContextValue";

const isSessionExpired = (session) => {
  if (!session?.expiresAtUtc) {
    return false;
  }

  const expiresAt = Date.parse(session.expiresAtUtc);
  if (!Number.isFinite(expiresAt)) {
    return false;
  }

  return expiresAt <= Date.now();
};

const getInitialSession = () => {
  const storedSession = dataService.getStoredSession();

  if (!storedSession || isSessionExpired(storedSession)) {
    dataService.clearSession();
    return null;
  }

  return storedSession;
};

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(getInitialSession);

  useEffect(() => {
    const handleAuthExpired = () => {
      setSession(null);
    };

    window.addEventListener("sealevel:auth-expired", handleAuthExpired);
    return () => {
      window.removeEventListener("sealevel:auth-expired", handleAuthExpired);
    };
  }, []);

  const login = useCallback(async (payload) => {
    const nextSession = await dataService.login(payload);
    setSession(nextSession);
    return nextSession;
  }, []);

  const register = useCallback(async (payload) => {
    const nextSession = await dataService.register(payload);
    setSession(nextSession);
    return nextSession;
  }, []);

  const logout = useCallback(() => {
    dataService.logout();
    setSession(null);
  }, []);

  const value = useMemo(() => {
    return {
      session,
      token: session?.token ?? null,
      user: session
        ? {
            email: session.email,
            username: session.username,
          }
        : null,
      isAuthenticated: Boolean(session?.token),
      isAuthReady: true,
      login,
      register,
      logout,
    };
  }, [session, login, register, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

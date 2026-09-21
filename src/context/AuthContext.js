import React, { createContext, useContext, useState, useEffect } from "react";
import { getToken, setToken, getUser, setUser, clearSession, apiRequest } from "../utils/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setCurrentUser] = useState(() => getUser());
  const [token, setCurrentToken] = useState(() => getToken());
  const [loading, setLoading] = useState(true);

  // Validate session on mount
  useEffect(() => {
    async function verifySession() {
      const savedToken = getToken();
      if (!savedToken) {
        setLoading(false);
        return;
      }

      try {
        const data = await apiRequest("/api/auth/me");
        if (data?.user) {
          setCurrentUser(data.user);
          setUser(data.user);
        } else {
          logout();
        }
      } catch (err) {
        // If 401/403, clear stale session
        if (err.status === 401 || err.status === 403) {
          logout();
        }
      } finally {
        setLoading(false);
      }
    }

    verifySession();
  }, []);

  const login = async (email, password, roleHint = null) => {
    const data = await apiRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, roleHint }),
    });

    if (data.token && data.user) {
      setToken(data.token);
      setUser(data.user);
      setCurrentToken(data.token);
      setCurrentUser(data.user);
      return data.user;
    }
    throw new Error("Invalid login response from server");
  };

  const registerStudent = async (formData) => {
    const data = await apiRequest("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(formData),
    });

    if (data.token && data.user) {
      setToken(data.token);
      setUser(data.user);
      setCurrentToken(data.token);
      setCurrentUser(data.user);
      return data.user;
    }
    return data;
  };

  const logout = () => {
    clearSession();
    setCurrentToken(null);
    setCurrentUser(null);
  };

  const refreshUser = async () => {
    try {
      const data = await apiRequest("/api/auth/me");
      if (data?.user) {
        setCurrentUser(data.user);
        setUser(data.user);
      }
    } catch {}
  };

  const value = {
    user,
    token,
    role: user?.role || null,
    isAuthenticated: !!token && !!user,
    loading,
    login,
    logout,
    registerStudent,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      user: null,
      token: null,
      role: null,
      loading: false,
      isAuthenticated: false,
      isStudent: false,
      isCollege: false,
      isMinistry: false,
      login: async () => {},
      logout: () => {},
      registerStudent: async () => {},
      refreshUser: async () => {},
    };
  }
  return context;
}

export default AuthContext;

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import { loginUser as apiLogin, getMyProfile } from "../services/api";
import type { UserProfile } from "../services/api";

interface AuthContextType {
  token: string | null;
  user: UserProfile | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(!!localStorage.getItem("token"));

  const fetchProfile = useCallback(async () => {
    try {
      const profile = await getMyProfile();
      setUser(profile);
    } catch {
      setToken(null);
      setUser(null);
      localStorage.removeItem("token");
    }
  }, []);

  useEffect(() => {
    if (token) {
      setIsLoading(true);
      fetchProfile().finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
      setUser(null);
    }
  }, [token, fetchProfile]);

  const login = async (email: string, password: string) => {
    const { token: newToken } = await apiLogin(email, password);
    localStorage.setItem("token", newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  const refreshProfile = async () => {
    await fetchProfile();
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isLoggedIn: !!token,
        isLoading,
        login,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

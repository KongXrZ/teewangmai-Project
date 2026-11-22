"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { signOutAction } from "@/features/auth/server/actions";
import { AUTH_UNAVAILABLE } from "@/features/auth/errors";
import type { AuthActionResult, CurrentUser } from "@/features/auth/types";

type AuthState = CurrentUser & {
  status: "loading" | "authenticated" | "unauthenticated" | "error";
  error: string | null;
};
type AuthContextValue = AuthState & {
  refresh: () => Promise<void>;
  signOut: () => Promise<AuthActionResult>;
  isSigningOut: boolean;
};

const signedOut: AuthState = {
  user: null,
  profile: null,
  status: "unauthenticated",
  error: null,
};
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    ...signedOut,
    status: "loading",
  });
  const [isSigningOut, setIsSigningOut] = useState(false);
  const requestVersion = useRef(0);
  const logoutPending = useRef(false);

  const refresh = useCallback(async () => {
    if (logoutPending.current) return;
    const version = ++requestVersion.current;
    try {
      const response = await fetch("/api/auth/me", {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (version !== requestVersion.current) return;
      if (response.status === 401) {
        setState(signedOut);
        return;
      }
      if (!response.ok) {
        setState({ ...signedOut, status: "error", error: AUTH_UNAVAILABLE });
        return;
      }
      const result = (await response.json()) as CurrentUser & {
        success: boolean;
      };
      if (version !== requestVersion.current) return;
      if (!result.success || !result.user) {
        setState({ ...signedOut, status: "error", error: AUTH_UNAVAILABLE });
        return;
      }
      setState({
        user: result.user,
        profile: result.profile,
        status: "authenticated",
        error: null,
      });
    } catch {
      if (version === requestVersion.current) {
        setState({ ...signedOut, status: "error", error: AUTH_UNAVAILABLE });
      }
    }
  }, []);

  const signOut = useCallback(async (): Promise<AuthActionResult> => {
    if (logoutPending.current)
      return { success: false, error: "กำลังออกจากระบบ" };
    logoutPending.current = true;
    ++requestVersion.current; // A late current-user response must not restore a logged-out identity.
    setIsSigningOut(true);
    try {
      const result = await signOutAction();
      if (result.success) {
        setState(signedOut);
        router.replace("/login");
        router.refresh();
      } else {
        setState((previous) => ({
          ...previous,
          error: result.error ?? AUTH_UNAVAILABLE,
        }));
      }
      return result;
    } catch {
      setState((previous) => ({ ...previous, error: AUTH_UNAVAILABLE }));
      return { success: false, error: AUTH_UNAVAILABLE };
    } finally {
      logoutPending.current = false;
      setIsSigningOut(false);
    }
  }, [router]);

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const onPageShow = () => {
      void refresh();
    };
    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("pageshow", onPageShow);
    let unsubscribe: (() => void) | undefined;
    try {
      const {
        data: { subscription },
      } = createClient().auth.onAuthStateChange((event) => {
        // Keep the callback synchronous: auth methods inside it can deadlock.
        if (event !== "INITIAL_SESSION")
          queueMicrotask(() => {
            void refresh();
          });
      });
      unsubscribe = () => subscription.unsubscribe();
    } catch {
      // Public pages can render without credentials; refresh reports unavailable Auth.
    }
    // The initial read is asynchronous; subsequent reads follow external events.
    queueMicrotask(() => {
      void refresh();
    });
    return () => {
      unsubscribe?.();
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [refresh]);

  return (
    <AuthContext.Provider value={{ ...state, refresh, signOut, isSigningOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

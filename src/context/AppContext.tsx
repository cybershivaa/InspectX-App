
"use client";

import React, { createContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import type { User, Role } from '@/lib/types';
import { supabase } from '@/lib/supabase';

interface AppContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<User | null>;
  logout: () => Promise<void>;
  updateUser: (updatedUser: User) => void;
}

export const AppContext = createContext<AppContextType | null>(null);

// Build a User object from a Supabase auth user + optional DB profile
function buildUserFromAuth(authUser: any, dbProfile?: any): User {
  return {
    id: authUser.id,
    name: dbProfile?.name || authUser.user_metadata?.name || authUser.email || '',
    email: authUser.email || dbProfile?.email || '',
    role: dbProfile?.role || authUser.user_metadata?.role || 'Inspector',
    avatar: dbProfile?.avatar || authUser.user_metadata?.avatar_url || '',
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Fetch DB profile — falls back gracefully to auth metadata on any error
    const fetchAndSetUser = async (authUser: any) => {
      try {
        const { data: dbProfile } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();
        if (mounted) setUser(buildUserFromAuth(authUser, dbProfile));
      } catch {
        // DB read failed (e.g. RLS) — keep user logged in using auth metadata
        if (mounted) setUser(buildUserFromAuth(authUser));
      }
    };

    // 1. Immediately restore session on mount (handles hard refresh)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user) {
        fetchAndSetUser(session.user).finally(() => {
          if (mounted) setLoading(false);
        });
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    // 2. Listen for subsequent auth changes (login, logout, token refresh)
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      // INITIAL_SESSION is already handled by getSession() above
      if (event === 'INITIAL_SESSION') return;

      if (session?.user) {
        await fetchAndSetUser(session.user);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      listener?.subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password?: string): Promise<User | null> => {
    if (!password) throw new Error("Password is required.");
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError || !signInData.user) throw signInError || new Error('No user found');

    const { data: dbProfile } = await supabase.from('users').select('*').eq('id', signInData.user.id).single();
    const loggedInUser = buildUserFromAuth(signInData.user, dbProfile);
    setUser(loggedInUser);
    return loggedInUser;
  }, []);
  
  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error("Error during sign out:", error);
    }
  }, []);

  const updateUser = useCallback((updatedUser: User) => {
    setUser(updatedUser);
  }, []);

  const contextValue = useMemo(
    () => ({ user, loading, login, logout, updateUser }),
    [user, loading, login, logout, updateUser]
  );

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

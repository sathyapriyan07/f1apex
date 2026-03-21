// src/hooks/useAuth.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase, getProfile } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) loadProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) loadProfile(session.user.id);
      else { setProfile(null); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(userId) {
    setLoading(true);
    const { data, error } = await getProfile(userId);
    setProfile(data);
    setProfileError(error ?? null);
    if (error) console.error('getProfile failed:', error);
    setLoading(false);
  }

  const isAdmin = profile?.role === 'admin';
  const isUser  = !!session;

  return (
    <AuthContext.Provider value={{ session, profile, profileError, loading, isAdmin, isUser, refreshProfile: () => loadProfile(session?.user?.id) }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

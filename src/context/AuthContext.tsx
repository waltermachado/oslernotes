import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User, Session } from '@supabase/supabase-js';

type UserRole = 'super_admin' | 'admin' | 'medico' | 'atendente' | 'unknown';

interface AuthUser extends User {
  papel?: UserRole;
  clinica_id?: string;
  nome?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<AuthUser | null>>;
  setSession: React.Dispatch<React.SetStateAction<Session | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        // We need to fetch the extra user data (role, etc.)
        fetchUserData(session.user);
      } else {
        setLoading(false);
      }
    });

    // Listen for changes on auth state (in, out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
         fetchUserData(session.user);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async (authUser: User) => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('papel, clinica_id, nome')
        .eq('id', authUser.id)
        .single();

      if (!error && data) {
        setUser({
          ...authUser,
          papel: data.papel as UserRole,
          clinica_id: data.clinica_id,
          nome: data.nome,
        });
      } else {
        setUser({ ...authUser, papel: 'unknown' });
      }
    } catch (err) {
      void err;
      setUser({ ...authUser, papel: 'unknown' });
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut, setUser, setSession }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

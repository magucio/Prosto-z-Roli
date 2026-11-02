import type { Session } from '@supabase/supabase-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { supabase } from './supabase';

type AuthState = { session: Session | null; loading: boolean };

const AuthContext = createContext<AuthState>({ session: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>({ session: null, loading: true });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setState({ session: data.session, loading: false }));
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setState({ session, loading: false });
      if (event === 'SIGNED_OUT' || event === 'SIGNED_IN') {
        // Dane zależne od użytkownika (profil, karty z is_owner) nie mogą przeciec między kontami.
        queryClient.removeQueries({ queryKey: ['account'] });
        queryClient.invalidateQueries();
      }
    });
    return () => data.subscription.unsubscribe();
  }, [queryClient]);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

export type SellerProfile = {
  farm_name: string | null;
  company_name: string | null;
  nip: string | null;
  regon: string | null;
  address_line: string | null;
  postal_code: string | null;
  city: string | null;
};

export type Account = {
  id: string;
  display_name: string;
  seller_type: 'private' | 'farm' | 'company';
  is_blocked: boolean;
  blocked_until: string | null;
  created_at: string;
  seller_profile: SellerProfile | null;
  admin_role: 'moderator' | 'admin' | 'superadmin' | null;
};

export function useAccount() {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    queryKey: ['account', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('my_account');
      if (error) throw error;
      return data as Account | null;
    },
  });
}

export const SELLER_TYPE_LABEL = {
  private: 'Osoba prywatna',
  farm: 'Rolnik / gospodarstwo',
  company: 'Firma',
} as const;

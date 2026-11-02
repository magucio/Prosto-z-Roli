import { errorMessage } from '@pzr/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';

import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export type MyListingRow = {
  id: string;
  kind: 'product' | 'service';
  title: string;
  status: 'draft' | 'pending_review' | 'active' | 'paused' | 'expired' | 'removed' | 'blocked';
  is_expired: boolean;
  place_name: string | null;
  expires_at: string | null;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
  item_count: number;
  main_image: string | null;
};

export function useMyListings() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['my_listings', session?.user.id],
    enabled: Boolean(session),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('my_listings');
      if (error) throw error;
      return (data as MyListingRow[] | null) ?? [];
    },
  });
}

type Action = 'pause' | 'resume' | 'confirm' | 'remove';

export function useListingAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action }: { id: string; action: Action }) => {
      const call =
        action === 'pause'
          ? supabase.rpc('pause_listing', { p_id: id })
          : action === 'resume'
            ? supabase.rpc('publish_listing', { p_id: id })
            : action === 'confirm'
              ? supabase.rpc('confirm_listing', { p_id: id })
              : supabase.rpc('remove_listing', { p_id: id });
      const { error } = await call;
      if (error) throw error;
      return action;
    },
    onSuccess: async (action, { id }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['my_listings'] }),
        queryClient.invalidateQueries({ queryKey: ['map_points'] }),
        queryClient.invalidateQueries({ queryKey: ['listing', id] }),
      ]);
      if (action === 'confirm') Alert.alert('Przedłużono', 'Ogłoszenie będzie aktywne przez kolejne 60 dni.');
    },
    onError: (e) => Alert.alert('Nie udało się', errorMessage(e)),
  });
}

export const STATUS_LABEL: Record<MyListingRow['status'], string> = {
  draft: 'Szkic',
  pending_review: 'Czeka na moderację',
  active: 'Aktywne',
  paused: 'Wstrzymane',
  expired: 'Wygasłe',
  removed: 'Usunięte',
  blocked: 'Zablokowane przez moderację',
};

export function daysLeft(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000);
}

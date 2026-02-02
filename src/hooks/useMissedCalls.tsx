import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useMissedCalls() {
  const { user } = useAuth();
  const [missedCount, setMissedCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setMissedCount(0);
      return;
    }

    const fetchMissedCalls = async () => {
      const { count, error } = await supabase
        .from('call_requests')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .eq('status', 'missed');

      if (!error && count !== null) {
        setMissedCount(count);
      }
    };

    fetchMissedCalls();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('missed-calls-count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'call_requests',
          filter: `recipient_id=eq.${user.id}`,
        },
        () => {
          fetchMissedCalls();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  return { missedCount };
}

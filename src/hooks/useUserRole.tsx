import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useUserRole() {
  const { user } = useAuth();
  const [isBdMarketing, setIsBdMarketing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkRole = async () => {
      if (!user) {
        setIsBdMarketing(false);
        setIsLoading(false);
        return;
      }

      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'bd_marketing')
        .maybeSingle();

      setIsBdMarketing(!!data);
      setIsLoading(false);
    };

    checkRole();
  }, [user]);

  return { isBdMarketing, isLoading };
}

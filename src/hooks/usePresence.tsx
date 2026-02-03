import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const OFFLINE_THRESHOLD = 60000; // 1 minute without heartbeat = offline

export function usePresence() {
  const { user } = useAuth();
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  const updatePresence = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Upsert presence record
      await supabase
        .from('user_presence')
        .upsert({
          user_id: user.id,
          status: 'online',
          last_heartbeat: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      // Also update last_seen in profiles
      await supabase
        .from('profiles')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', user.id);
    } catch (error) {
      console.error('Error updating presence:', error);
    }
  }, [user?.id]);

  const setOffline = useCallback(async () => {
    if (!user?.id) return;

    try {
      await supabase
        .from('user_presence')
        .update({ status: 'offline' })
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error setting offline:', error);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    // Initial presence update
    updatePresence();

    // Set up heartbeat interval
    heartbeatRef.current = setInterval(updatePresence, HEARTBEAT_INTERVAL);

    // Handle visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updatePresence();
      }
    };

    // Handle before unload
    const handleBeforeUnload = () => {
      setOffline();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      setOffline();
    };
  }, [user?.id, updatePresence, setOffline]);
}

// Hook for admins to get user presence data
export function useUserPresenceList() {
  const { isAdmin } = useAuth();

  const getOnlineStatus = useCallback((lastHeartbeat: string | null): 'online' | 'away' | 'offline' => {
    if (!lastHeartbeat) return 'offline';
    
    const lastSeen = new Date(lastHeartbeat).getTime();
    const now = Date.now();
    const diff = now - lastSeen;

    if (diff < OFFLINE_THRESHOLD) return 'online';
    if (diff < OFFLINE_THRESHOLD * 5) return 'away'; // 5 minutes = away
    return 'offline';
  }, []);

  return { isAdmin, getOnlineStatus };
}

export { OFFLINE_THRESHOLD };

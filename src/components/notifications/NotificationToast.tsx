import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export default function NotificationToast() {
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('notification-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const notification = payload.new as { title: string; message: string | null; type: string };
          toast({
            title: notification.title,
            description: notification.message || undefined,
            duration: 6000,
          });

          // Play notification sound
          try {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2JkZeOgHBkZXN/iI+RjYN4bmZod4KLj4+Kg3dualxZYGx4gYiLiYV+dnBqZmhvd36EiIiGgnx1b2poa3J5f4OGhoSAe3ZwbGtuc3l+goWEg397dnJubG5zeH2BhIOCf3x3c3BvcnZ7f4KDgoB9endzcXF0d3t/gYKBf3x6d3RycnR3en2Ag4KAf3x5d3Rzc3V4e36BgoF/fXp4dXN0dnh7foCBgX99e3h2dHR1d3p8f4GBf317eXd1dHV3eXx+gIF/fXt5d3V1dnh6fH6AgH9+fHp4dnV2eHp8fn+Af358e3l3dnZ3eXt9f4B/fn17eXd2dnh5e31/gH9+fHt5d3Z2eHl7fX9/f358e3l4dnZ4eXt9f39+fXt6eHd2d3l6fH5/f359e3p4d3Z3eXt8fn9/fn17enl3dnd5ent9fn9+fXx6eXd3d3l6fH1+fn59fHp5eHd3eXp7fX5+fn18e3l4d3d5ent8fn5+fXx7enh3d3h6e3x+fn59fHt6eHd3eHp7fH1+fn18e3p5eHd4eXt8fX5+fXx7enl4d3h5e3x9fn59fHt6eXh4eHp7fH1+fn18e3p5eHh4eXt8fX1+fXx7enl4eHl6e3x9fn18fHt6eXh4eXp7fH1+fXx8e3p5eHh5ent8fX19fHx7enl5eHl6e3x9fX18fHt6eXl5eXp7fHx9fXx8e3p6eXl5ent8fH19fHx7e3p5eXl6ent8fH19fHx7enp5eXl6e3t8fX18fHt7enp5eXp6e3x8fX18fHt7enp6eXp6e3x8fHx8fHt7enp6enp6e3x8fHx8fHt7e3p6enp7e3x8fHx8fHt7e3p6enp7e3t8fHx8fHt7e3p6enp7e3t8fHx8fHt7e3t6enp7e3t8fHx8fHx7e3t6enp7e3t7fHx8fHx7e3t7e3p7e3t7fHx8fHx7e3t7e3p7e3t7e3x8fHx7e3t7e3t7e3t7e3x8fHx7e3t7e3t7e3t7fHx8fHx7e3t7e3t7e3t7e3x8fHx7e3t7e3t7e3t7e3t8fHx7e3t7');
            audio.volume = 0.3;
            audio.play().catch(() => {});
          } catch {}
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast]);

  return null;
}

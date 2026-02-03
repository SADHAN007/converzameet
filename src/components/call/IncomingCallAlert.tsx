import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, X, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CallRequest {
  id: string;
  caller_id: string;
  recipient_id: string;
  meeting_id: string | null;
  status: string;
  created_at: string;
  expires_at: string;
  caller_profile?: {
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

// Create ringtone using Web Audio API
const createRingtone = (audioContext: AudioContext) => {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.type = 'sine';
  oscillator.frequency.value = 440; // A4 note
  gainNode.gain.value = 0;
  
  return { oscillator, gainNode };
};

// Request notification permission on load
const requestNotificationPermission = async () => {
  if ('Notification' in window && Notification.permission === 'default') {
    await Notification.requestPermission();
  }
};

const showDesktopNotification = (callerName: string, callId: string) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    const notification = new Notification('Incoming Call', {
      body: `${callerName} is calling you`,
      icon: '/favicon.png',
      tag: `call-${callId}`,
      requireInteraction: true,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    return notification;
  }
  return null;
};

export default function IncomingCallAlert() {
  const { toast } = useToast();
  const [incomingCall, setIncomingCall] = useState<CallRequest | null>(null);
  const [responding, setResponding] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const ringtoneIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const notificationRef = useRef<Notification | null>(null);

  // Request notification permission on mount
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Ringtone pattern: ring for 1s, silence for 0.5s
  const startRingtone = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const { oscillator, gainNode } = createRingtone(ctx);
      oscillatorRef.current = oscillator;
      gainNodeRef.current = gainNode;
      
      oscillator.start();
      
      let isRinging = true;
      
      // Initial ring
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      
      // Create ring pattern
      ringtoneIntervalRef.current = setInterval(() => {
        if (!gainNodeRef.current || !audioContextRef.current) return;
        
        const now = audioContextRef.current.currentTime;
        if (isRinging) {
          // Fade out
          gainNodeRef.current.gain.setTargetAtTime(0, now, 0.1);
        } else {
          // Ring with two-tone pattern
          gainNodeRef.current.gain.setTargetAtTime(0.3, now, 0.05);
          if (oscillatorRef.current) {
            // Alternate between two frequencies for classic ring
            oscillatorRef.current.frequency.setValueAtTime(
              oscillatorRef.current.frequency.value === 440 ? 480 : 440,
              now
            );
          }
        }
        isRinging = !isRinging;
      }, 500);
      
    } catch (error) {
      console.error('Error playing ringtone:', error);
    }
  };

  const stopRingtone = () => {
    if (ringtoneIntervalRef.current) {
      clearInterval(ringtoneIntervalRef.current);
      ringtoneIntervalRef.current = null;
    }
    
    if (oscillatorRef.current) {
      try {
        oscillatorRef.current.stop();
        oscillatorRef.current.disconnect();
      } catch {}
      oscillatorRef.current = null;
    }
    
    if (gainNodeRef.current) {
      gainNodeRef.current.disconnect();
      gainNodeRef.current = null;
    }
  };

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check for existing pending calls
      const { data: existingCalls } = await supabase
        .from('call_requests')
        .select('*')
        .eq('recipient_id', user.id)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      if (existingCalls && existingCalls.length > 0) {
        await fetchCallerAndSetCall(existingCalls[0]);
      }

      // Subscribe to new calls
      channel = supabase
        .channel('incoming-calls')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'call_requests',
            filter: `recipient_id=eq.${user.id}`,
          },
          async (payload) => {
            await fetchCallerAndSetCall(payload.new as CallRequest);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'call_requests',
            filter: `recipient_id=eq.${user.id}`,
          },
          (payload) => {
            const updated = payload.new as CallRequest;
            if (updated.status !== 'pending') {
              setIncomingCall(null);
            }
          }
        )
        .subscribe();
    };

    const fetchCallerAndSetCall = async (call: CallRequest) => {
      // Fetch caller profile
      const { data: callerProfile } = await supabase
        .from('profiles_public')
        .select('full_name, email, avatar_url')
        .eq('id', call.caller_id)
        .single();

      setIncomingCall({
        ...call,
        caller_profile: callerProfile || undefined,
      });
    };

    setupSubscription();

    return () => {
      channel?.unsubscribe();
      stopRingtone();
    };
  }, []);

  // Play/stop ringtone and show notification when call state changes
  useEffect(() => {
    if (incomingCall) {
      startRingtone();
      // Show desktop notification
      const callerName = incomingCall.caller_profile?.full_name || 'Unknown';
      notificationRef.current = showDesktopNotification(callerName, incomingCall.id);
    } else {
      stopRingtone();
      // Close notification
      if (notificationRef.current) {
        notificationRef.current.close();
        notificationRef.current = null;
      }
    }
    
    return () => {
      stopRingtone();
      if (notificationRef.current) {
        notificationRef.current.close();
        notificationRef.current = null;
      }
    };
  }, [incomingCall]);

  // Auto-dismiss expired calls
  useEffect(() => {
    if (!incomingCall) return;

    const checkExpiry = setInterval(() => {
      if (new Date(incomingCall.expires_at) < new Date()) {
        setIncomingCall(null);
      }
    }, 1000);

    return () => clearInterval(checkExpiry);
  }, [incomingCall]);

  const handleAccept = async () => {
    if (!incomingCall) return;
    setResponding(true);
    
    try {
      await supabase
        .from('call_requests')
        .update({ 
          status: 'accepted',
          responded_at: new Date().toISOString()
        })
        .eq('id', incomingCall.id);

      toast({
        title: '✅ Call Accepted',
        description: `You accepted the call from ${incomingCall.caller_profile?.full_name || 'Unknown'}`,
      });
      setIncomingCall(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setResponding(false);
    }
  };

  const handleDecline = async () => {
    if (!incomingCall) return;
    setResponding(true);
    
    try {
      await supabase
        .from('call_requests')
        .update({ 
          status: 'declined',
          responded_at: new Date().toISOString()
        })
        .eq('id', incomingCall.id);

      setIncomingCall(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setResponding(false);
    }
  };

  return (
    <AnimatePresence>
      {incomingCall && (
        <motion.div
          initial={{ opacity: 0, y: -100, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -100, scale: 0.9 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-sm"
        >
          <div className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl overflow-hidden">
            {/* Animated gradient border */}
            <motion.div
              className="absolute inset-0 rounded-2xl"
              style={{
                background: 'linear-gradient(90deg, #10b981, #34d399, #10b981)',
                backgroundSize: '200% 100%',
              }}
              animate={{
                backgroundPosition: ['0% 0%', '200% 0%'],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            />
            
            <div className="relative bg-card m-[2px] rounded-2xl p-4">
              <div className="flex items-center gap-4">
                {/* Caller avatar with pulse */}
                <div className="relative">
                  <motion.div
                    className="absolute inset-0 rounded-full bg-emerald-500/30"
                    animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                  <Avatar className="h-14 w-14 ring-2 ring-emerald-500">
                    <AvatarImage src={incomingCall.caller_profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-green-500 text-white text-lg">
                      {incomingCall.caller_profile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 
                       <User className="h-6 w-6" />}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* Caller info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">
                    {incomingCall.caller_profile?.full_name || 'Unknown Caller'}
                  </p>
                  <motion.p 
                    className="text-sm text-emerald-500 font-medium"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    Incoming call...
                  </motion.p>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleDecline}
                    disabled={responding}
                    className={cn(
                      'h-12 w-12 rounded-full flex items-center justify-center',
                      'bg-gradient-to-br from-red-500 to-rose-600 text-white',
                      'shadow-lg shadow-red-500/25',
                      'disabled:opacity-50'
                    )}
                  >
                    <PhoneOff className="h-5 w-5" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleAccept}
                    disabled={responding}
                    className={cn(
                      'h-12 w-12 rounded-full flex items-center justify-center',
                      'bg-gradient-to-br from-emerald-400 to-green-500 text-white',
                      'shadow-lg shadow-emerald-500/25',
                      'disabled:opacity-50'
                    )}
                  >
                    <Phone className="h-5 w-5" />
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

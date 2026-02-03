import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, User, Volume2, VolumeX } from 'lucide-react';
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

// Microsoft Teams-style ringtone frequencies and pattern
const TEAMS_RINGTONE = {
  notes: [
    { freq: 523.25, duration: 0.15 },  // C5
    { freq: 659.25, duration: 0.15 },  // E5
    { freq: 783.99, duration: 0.3 },   // G5
  ],
  pauseBetweenRings: 1.5,
};

const createTeamsRingtone = (audioContext: AudioContext) => {
  const gainNode = audioContext.createGain();
  gainNode.connect(audioContext.destination);
  gainNode.gain.value = 0;
  return { gainNode };
};

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
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const ringtoneIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPlayingRef = useRef(false);
  const notificationRef = useRef<Notification | null>(null);

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  const playRingSequence = (ctx: AudioContext, gainNode: GainNode) => {
    if (isMuted) return;
    
    let time = ctx.currentTime;
    
    TEAMS_RINGTONE.notes.forEach((note) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = note.freq;
      osc.connect(gainNode);
      
      gainNode.gain.setValueAtTime(0, time);
      gainNode.gain.linearRampToValueAtTime(0.25, time + 0.02);
      gainNode.gain.setValueAtTime(0.25, time + note.duration - 0.02);
      gainNode.gain.linearRampToValueAtTime(0, time + note.duration);
      
      osc.start(time);
      osc.stop(time + note.duration);
      
      time += note.duration;
    });
  };

  const startRingtone = () => {
    try {
      if (isPlayingRef.current) return;
      isPlayingRef.current = true;
      
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const { gainNode } = createTeamsRingtone(ctx);
      gainNodeRef.current = gainNode;
      
      if (!isMuted) {
        playRingSequence(ctx, gainNode);
      }
      
      const totalNoteDuration = TEAMS_RINGTONE.notes.reduce((acc, n) => acc + n.duration, 0);
      const repeatInterval = (totalNoteDuration + TEAMS_RINGTONE.pauseBetweenRings) * 1000;
      
      ringtoneIntervalRef.current = setInterval(() => {
        if (!audioContextRef.current || !gainNodeRef.current || isMuted) return;
        playRingSequence(audioContextRef.current, gainNodeRef.current);
      }, repeatInterval);
      
    } catch (error) {
      console.error('Error playing ringtone:', error);
    }
  };

  const stopRingtone = () => {
    isPlayingRef.current = false;
    
    if (ringtoneIntervalRef.current) {
      clearInterval(ringtoneIntervalRef.current);
      ringtoneIntervalRef.current = null;
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
      const { data: callerProfile } = await supabase
        .from('profiles_public')
        .select('full_name, email, avatar_url')
        .eq('id', call.caller_id)
        .single();

      setIncomingCall({
        ...call,
        caller_profile: callerProfile || undefined,
      });
      setElapsedTime(0);
    };

    setupSubscription();

    return () => {
      channel?.unsubscribe();
      stopRingtone();
    };
  }, []);

  // Timer for call duration display
  useEffect(() => {
    if (!incomingCall) {
      setElapsedTime(0);
      return;
    }

    const timer = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [incomingCall]);

  useEffect(() => {
    if (incomingCall) {
      startRingtone();
      const callerName = incomingCall.caller_profile?.full_name || 'Unknown';
      notificationRef.current = showDesktopNotification(callerName, incomingCall.id);
    } else {
      stopRingtone();
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

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (!isMuted) {
      stopRingtone();
    } else if (incomingCall) {
      startRingtone();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getInitials = (name?: string | null) => {
    if (!name) return null;
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  return (
    <AnimatePresence>
      {incomingCall && (
        <>
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[99]"
            onClick={handleDecline}
          />
          
          {/* Call modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] w-[90%] max-w-xs"
          >
            <div className="relative bg-card rounded-3xl shadow-2xl overflow-hidden border border-border">
              {/* Animated background gradient */}
              <div className="absolute inset-0 overflow-hidden">
                <motion.div
                  className="absolute inset-0 opacity-20"
                  style={{
                    background: 'radial-gradient(circle at 50% 0%, hsl(var(--primary)) 0%, transparent 70%)',
                  }}
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.1, 0.2, 0.1],
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                />
              </div>

              <div className="relative p-6 flex flex-col items-center text-center">
                {/* Mute button */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={toggleMute}
                  className="absolute top-4 right-4 h-8 w-8 rounded-full bg-muted/80 flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
                >
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </motion.button>

                {/* Status label */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4"
                >
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Incoming Call
                  </span>
                </motion.div>

                {/* Avatar with animated rings */}
                <div className="relative mb-4">
                  {/* Outer pulse ring */}
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-primary/30"
                    animate={{ 
                      scale: [1, 1.6, 1.6], 
                      opacity: [0.6, 0, 0] 
                    }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                    style={{ width: 96, height: 96, left: -8, top: -8 }}
                  />
                  {/* Middle pulse ring */}
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-primary/40"
                    animate={{ 
                      scale: [1, 1.4, 1.4], 
                      opacity: [0.8, 0, 0] 
                    }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', delay: 0.3 }}
                    style={{ width: 96, height: 96, left: -8, top: -8 }}
                  />
                  {/* Inner glow */}
                  <motion.div
                    className="absolute inset-0 rounded-full bg-primary/20"
                    animate={{ 
                      scale: [1, 1.15, 1],
                    }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ width: 80, height: 80 }}
                  />
                  
                  <Avatar className="h-20 w-20 ring-4 ring-primary/30 shadow-xl relative z-10">
                    <AvatarImage src={incomingCall.caller_profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-xl font-semibold">
                      {getInitials(incomingCall.caller_profile?.full_name) || <User className="h-8 w-8" />}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* Caller name */}
                <h3 className="text-xl font-semibold text-foreground mb-1">
                  {incomingCall.caller_profile?.full_name || 'Unknown Caller'}
                </h3>
                
                {/* Call status with timer */}
                <motion.p 
                  className="text-sm text-muted-foreground mb-6 flex items-center gap-2"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                  Ringing • {formatTime(elapsedTime)}
                </motion.p>

                {/* Action buttons */}
                <div className="flex items-center justify-center gap-6">
                  {/* Decline button */}
                  <div className="flex flex-col items-center gap-2">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={handleDecline}
                      disabled={responding}
                      className={cn(
                        'h-16 w-16 rounded-full flex items-center justify-center',
                        'bg-gradient-to-br from-destructive to-destructive/80 text-destructive-foreground',
                        'shadow-lg shadow-destructive/30',
                        'disabled:opacity-50 transition-shadow hover:shadow-xl hover:shadow-destructive/40'
                      )}
                    >
                      <PhoneOff className="h-7 w-7" />
                    </motion.button>
                    <span className="text-xs text-muted-foreground font-medium">Decline</span>
                  </div>

                  {/* Accept button */}
                  <div className="flex flex-col items-center gap-2">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={handleAccept}
                      disabled={responding}
                      className={cn(
                        'h-16 w-16 rounded-full flex items-center justify-center',
                        'bg-gradient-to-br from-emerald-500 to-green-600 text-white',
                        'shadow-lg shadow-emerald-500/30',
                        'disabled:opacity-50 transition-shadow hover:shadow-xl hover:shadow-emerald-500/40'
                      )}
                    >
                      <motion.div
                        animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
                        transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
                      >
                        <Phone className="h-7 w-7" />
                      </motion.div>
                    </motion.button>
                    <span className="text-xs text-muted-foreground font-medium">Accept</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

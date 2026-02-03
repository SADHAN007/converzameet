import { motion } from 'framer-motion';
import { Check, X, Clock, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Participant {
  user_id: string;
  has_agreed: boolean;
  agreed_at: string | null;
  profiles?: {
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

interface ApprovalProgressBarProps {
  participants: Participant[];
  isSent: boolean;
  className?: string;
}

export default function ApprovalProgressBar({
  participants,
  isSent,
  className,
}: ApprovalProgressBarProps) {
  if (!participants || participants.length === 0) {
    return null;
  }

  const approved = participants.filter(p => p.has_agreed).length;
  const pending = participants.filter(p => !p.has_agreed).length;
  const total = participants.length;
  const progressPercentage = (approved / total) * 100;

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  const getStatus = () => {
    if (!isSent) return { label: 'Draft', color: 'text-muted-foreground', bgColor: 'bg-muted' };
    if (approved === total) return { label: 'Approved', color: 'text-green-600', bgColor: 'bg-green-500' };
    if (approved > 0) return { label: 'Partial', color: 'text-amber-600', bgColor: 'bg-amber-500' };
    return { label: 'Pending', color: 'text-amber-600', bgColor: 'bg-amber-500' };
  };

  const status = getStatus();

  return (
    <div className={cn("space-y-2", className)}>
      {/* Progress Header */}
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium flex items-center gap-1.5">
          {status.label === 'Approved' ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : status.label === 'Draft' ? (
            <Clock className="h-4 w-4 text-muted-foreground" />
          ) : (
            <AlertCircle className="h-4 w-4 text-amber-500" />
          )}
          <span className={status.color}>
            {status.label}
          </span>
        </span>
        <span className="text-muted-foreground">
          {approved}/{total} approved
        </span>
      </div>

      {/* Progress Bar */}
      <div className="relative">
        <Progress 
          value={isSent ? progressPercentage : 0} 
          className="h-2"
        />
        {/* Custom color overlay based on status */}
        <motion.div
          className={cn(
            "absolute top-0 left-0 h-2 rounded-full",
            approved === total ? "bg-green-500" : "bg-amber-500"
          )}
          initial={{ width: 0 }}
          animate={{ width: isSent ? `${progressPercentage}%` : 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      {/* Participant Status Icons */}
      <TooltipProvider>
        <div className="flex items-center gap-1 flex-wrap">
          {participants.map((participant) => (
            <Tooltip key={participant.user_id}>
              <TooltipTrigger asChild>
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="relative"
                >
                  <Avatar className={cn(
                    "h-7 w-7 border-2 transition-all",
                    participant.has_agreed 
                      ? "border-green-500 ring-2 ring-green-500/20" 
                      : isSent 
                        ? "border-amber-500 ring-2 ring-amber-500/20"
                        : "border-muted"
                  )}>
                    <AvatarImage src={participant.profiles?.avatar_url || undefined} />
                    <AvatarFallback className="text-[10px]">
                      {getInitials(participant.profiles?.full_name || null, participant.profiles?.email || '')}
                    </AvatarFallback>
                  </Avatar>
                  {/* Status indicator */}
                  <div className={cn(
                    "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full flex items-center justify-center",
                    participant.has_agreed 
                      ? "bg-green-500" 
                      : isSent 
                        ? "bg-amber-500"
                        : "bg-muted-foreground"
                  )}>
                    {participant.has_agreed ? (
                      <Check className="h-2 w-2 text-white" />
                    ) : isSent ? (
                      <Clock className="h-2 w-2 text-white" />
                    ) : (
                      <Clock className="h-2 w-2 text-white" />
                    )}
                  </div>
                </motion.div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <div className="flex items-center gap-2">
                  <span>{participant.profiles?.full_name || participant.profiles?.email?.split('@')[0]}</span>
                  {participant.has_agreed ? (
                    <span className="text-green-500 flex items-center gap-0.5">
                      <Check className="h-3 w-3" /> Approved
                    </span>
                  ) : (
                    <span className="text-amber-500 flex items-center gap-0.5">
                      <Clock className="h-3 w-3" /> Pending
                    </span>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>

      {/* Pending List */}
      {isSent && pending > 0 && (
        <div className="text-xs text-muted-foreground">
          <span className="font-medium text-amber-600">Waiting for: </span>
          {participants
            .filter(p => !p.has_agreed)
            .map(p => p.profiles?.full_name || p.profiles?.email?.split('@')[0])
            .join(', ')}
        </div>
      )}
    </div>
  );
}

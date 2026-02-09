import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Clock, User, Paperclip, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { Task } from '@/hooks/useTasks';

const PRIORITY_CONFIG = {
  low: { label: 'Low', class: 'bg-muted text-muted-foreground' },
  medium: { label: 'Medium', class: 'bg-blue-500/10 text-blue-600' },
  high: { label: 'High', class: 'bg-orange-500/10 text-orange-600' },
  urgent: { label: 'Urgent', class: 'bg-red-500/10 text-red-600' },
};

interface TaskCardProps {
  task: Task;
  onClick: (task: Task) => void;
}

export default function TaskCard({ task, onClick }: TaskCardProps) {
  const priority = PRIORITY_CONFIG[task.priority];
  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && !['approved', 'completed'].includes(task.status);
  const assigneeName = task.assigned_to_profile?.full_name || task.assigned_to_profile?.email || 'Unassigned';
  const initials = assigneeName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      whileHover={{ y: -2 }}
      className="cursor-pointer"
      onClick={() => onClick(task)}
    >
      <Card className={cn(
        "border shadow-sm hover:shadow-md transition-shadow",
        isOverdue && "border-destructive/50"
      )}>
        <CardContent className="p-3 space-y-2">
          {/* Project & Priority */}
          <div className="flex items-center justify-between gap-2">
            {task.project && (
              <Badge variant="outline" className="text-[10px] px-1.5 truncate max-w-[120px]">
                {task.project.name}
              </Badge>
            )}
            <Badge className={cn('text-[10px] px-1.5', priority.class)}>
              {priority.label}
            </Badge>
          </div>

          {/* Title */}
          <p className="font-medium text-sm leading-snug line-clamp-2">{task.task_name}</p>

          {/* Deadline */}
          {task.deadline && (
            <div className={cn(
              "flex items-center gap-1 text-xs",
              isOverdue ? "text-destructive" : "text-muted-foreground"
            )}>
              {isOverdue ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
              <span>{format(new Date(task.deadline), 'MMM dd, hh:mm a')}</span>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{initials}</AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>{assigneeName}</TooltipContent>
            </Tooltip>

            <div className="flex items-center gap-2">
              {(task.attachments?.length || 0) > 0 && (
                <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
                  <Paperclip className="h-3 w-3" />
                  <span>{task.attachments?.length}</span>
                </div>
              )}
              {task.status === 'approved' && <CheckCircle className="h-3.5 w-3.5 text-green-500" />}
              {task.status === 'rejected' && <XCircle className="h-3.5 w-3.5 text-red-500" />}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

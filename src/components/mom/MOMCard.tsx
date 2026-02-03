import { motion } from 'framer-motion';
import { 
  FileText, Calendar, User, Edit, Trash2, Eye, 
  Send, Check, Clock, CheckCircle2, AlertCircle, 
  Paperclip, MoreHorizontal, ExternalLink
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import ApprovalProgressBar from './ApprovalProgressBar';

interface MOMParticipant {
  id: string;
  user_id: string;
  has_agreed: boolean;
  agreed_at: string | null;
  profiles?: { 
    full_name: string | null; 
    email: string;
    avatar_url: string | null;
  };
}

interface MOM {
  id: string;
  title: string;
  content: any;
  created_at: string;
  updated_at: string;
  project_id: string;
  created_by: string | null;
  is_sent: boolean;
  sent_at: string | null;
  projects?: { name: string; color: string };
  profiles?: { full_name: string | null; email: string };
  participants?: MOMParticipant[];
}

interface MOMCardProps {
  mom: MOM;
  index: number;
  isCreator: boolean;
  isAdmin: boolean;
  canAgree: boolean;
  hasAgreed: boolean;
  isSelected: boolean;
  isSelectionMode: boolean;
  onView: () => void;
  onEdit?: () => void;
  onDelete: () => void;
  onSend: () => void;
  onAgree: () => void;
  onSelect: (selected: boolean) => void;
}

export default function MOMCard({
  mom,
  index,
  isCreator,
  isAdmin,
  canAgree,
  hasAgreed,
  isSelected,
  isSelectionMode,
  onView,
  onEdit,
  onDelete,
  onSend,
  onAgree,
  onSelect,
}: MOMCardProps) {
  const getApprovalStatus = () => {
    if (!mom.is_sent) return 'draft';
    if (!mom.participants || mom.participants.length === 0) return 'sent';
    const allAgreed = mom.participants.every(p => p.has_agreed);
    if (allAgreed) return 'approved';
    return 'pending';
  };

  const status = getApprovalStatus();

  const statusConfig = {
    draft: {
      label: 'Draft',
      icon: Clock,
      className: 'bg-muted text-muted-foreground border-muted',
    },
    sent: {
      label: 'Sent',
      icon: CheckCircle2,
      className: 'bg-primary/10 text-primary border-primary/20',
    },
    pending: {
      label: 'Pending Approval',
      icon: AlertCircle,
      className: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    },
    approved: {
      label: 'Approved',
      icon: CheckCircle2,
      className: 'bg-green-500/10 text-green-600 border-green-500/20',
    },
  };

  const currentStatus = statusConfig[status];
  const StatusIcon = currentStatus.icon;

  const hasParticipants = mom.participants && mom.participants.length > 0;
  const canSendDraft = isCreator && !mom.is_sent && hasParticipants;

  const handleCardClick = (e: React.MouseEvent) => {
    // If in selection mode, toggle selection on card click
    if (isSelectionMode) {
      e.preventDefault();
      e.stopPropagation();
      onSelect(!isSelected);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.03, duration: 0.2 }}
      layout
    >
      <Card 
        className={cn(
          "group relative overflow-hidden transition-all duration-300",
          "hover:shadow-lg hover:-translate-y-0.5",
          "border-l-4",
          status === 'approved' && "border-l-green-500",
          status === 'pending' && "border-l-amber-500",
          status === 'draft' && "border-l-muted-foreground/30",
          status === 'sent' && "border-l-primary",
          isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
          isSelectionMode && "cursor-pointer"
        )}
        onClick={handleCardClick}
      >
        {/* Selected overlay */}
        {isSelected && (
          <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
        )}
        
        {/* Subtle gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        
        <CardContent className="p-0">
          {/* Main Content Area */}
          <div className="p-5">
            <div className="flex items-start gap-4">
              {/* Selection Checkbox */}
              <div 
                className={cn(
                  "flex-shrink-0 transition-all duration-200",
                  isSelectionMode ? "opacity-100 w-6" : "opacity-0 w-0 overflow-hidden"
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(checked) => onSelect(checked as boolean)}
                  className="mt-3"
                />
              </div>

              {/* Project Color Indicator */}
              <div
                className="h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm transition-transform group-hover:scale-105"
                style={{ backgroundColor: mom.projects?.color || 'hsl(var(--primary))' }}
              >
                <FileText className="h-6 w-6 text-white" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 space-y-3">
                {/* Title & Status Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <h3 
                      className="font-semibold text-foreground truncate cursor-pointer hover:text-primary transition-colors"
                      onClick={onView}
                    >
                      {mom.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      {mom.projects && (
                        <Badge variant="outline" className="font-normal text-xs">
                          {mom.projects.name}
                        </Badge>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(mom.created_at), 'MMM d, yyyy')}
                      </span>
                      {mom.profiles && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {mom.profiles.full_name || mom.profiles.email.split('@')[0]}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status Badge & Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge 
                      variant="outline" 
                      className={cn("gap-1 text-xs font-medium border", currentStatus.className)}
                    >
                      <StatusIcon className="h-3 w-3" />
                      {currentStatus.label}
                    </Badge>

                    {/* Quick Actions Dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={onView} className="gap-2">
                          <Eye className="h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        {isCreator && (
                          <DropdownMenuItem onClick={onEdit} className="gap-2">
                            <Edit className="h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                        )}
                        {canSendDraft && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={onSend} className="gap-2 text-primary">
                              <Send className="h-4 w-4" />
                              Send to Participants
                            </DropdownMenuItem>
                          </>
                        )}
                        {(isCreator || isAdmin) && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={onDelete} 
                              className="gap-2 text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Approval Progress Section */}
                {hasParticipants && (
                  <div className="pt-2">
                    <ApprovalProgressBar
                      participants={mom.participants!}
                      isSent={mom.is_sent}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Footer - Only shows when relevant */}
          {(canAgree || canSendDraft) && (
            <>
              <Separator />
              <div className="px-5 py-3 bg-muted/30 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {canAgree 
                    ? "You're invited to approve this MOM" 
                    : "Ready to send to participants"
                  }
                </span>
                <div className="flex items-center gap-2">
                  {canSendDraft && (
                    <Button 
                      size="sm" 
                      onClick={onSend}
                      className="gap-1.5 h-8"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Send Now
                    </Button>
                  )}
                  {canAgree && (
                    <Button 
                      size="sm" 
                      onClick={onAgree}
                      className="gap-1.5 h-8 bg-green-600 hover:bg-green-700"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Approve
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Already Agreed Indicator */}
          {hasAgreed && mom.is_sent && (
            <>
              <Separator />
              <div className="px-5 py-2.5 bg-green-500/5 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-xs text-green-600 font-medium">
                  You've approved this MOM
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

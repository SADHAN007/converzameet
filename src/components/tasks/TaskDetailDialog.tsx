import { useState } from 'react';
import { format } from 'date-fns';
import { Loader2, Clock, User, FolderKanban, Paperclip, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import type { Task } from '@/hooks/useTasks';

const STATUS_OPTIONS: { value: Task['status']; label: string }[] = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'in_review', label: 'In Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'completed', label: 'Completed' },
];

const PRIORITY_COLORS = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-blue-500/10 text-blue-600',
  high: 'bg-orange-500/10 text-orange-600',
  urgent: 'bg-red-500/10 text-red-600',
};

interface TaskDetailDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateStatus: (taskId: string, status: Task['status']) => Promise<void>;
  onUpdateTask: (taskId: string, data: Partial<Task>) => Promise<void>;
  onDelete: (taskId: string) => Promise<void>;
}

export default function TaskDetailDialog({ task, open, onOpenChange, onUpdateStatus, onUpdateTask, onDelete }: TaskDetailDialogProps) {
  const { user, isAdmin, userRole } = useAuth();
  const { toast } = useToast();
  const [newStatus, setNewStatus] = useState<Task['status'] | ''>('');
  const [remark, setRemark] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!task) return null;

  const isAssigner = task.assigned_by === user?.id;
  const isAssignee = task.assigned_to === user?.id;
  const isGraphicDesigner = userRole === 'graphic_designer';
  const isDigitalMarketer = userRole === 'digital_marketer';
  
  // Graphic designers can only change status on tasks assigned to them
  // Digital marketers and admins can change status on any task they're involved with
  const canChangeStatus = isAssignee || isAssigner || isAdmin;
  
  // Only digital marketers (assigners) and admins can approve/reject
  const canApprove = (isAssigner && (isDigitalMarketer || isAdmin)) || isAdmin;
  
  // Only digital marketers (assigners) and admins can delete
  const canDelete = isAssigner || isAdmin;
  
  // Graphic designers can only set: in_progress, in_review
  // Digital marketers/admins can set any status
  const availableStatuses = isGraphicDesigner && isAssignee && !isAdmin
    ? STATUS_OPTIONS.filter(s => ['in_progress', 'in_review'].includes(s.value))
    : STATUS_OPTIONS;
    
  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && !['approved', 'completed'].includes(task.status);

  const handleStatusChange = async () => {
    if (!newStatus) return;
    setSaving(true);
    try {
      await onUpdateStatus(task.id, newStatus);
      toast({ title: 'Status updated' });
      setNewStatus('');
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    setSaving(true);
    try {
      await onUpdateStatus(task.id, 'approved');
      toast({ title: 'Task approved' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    setSaving(true);
    try {
      await onUpdateStatus(task.id, 'rejected');
      toast({ title: 'Task rejected' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRemark = async () => {
    if (!remark.trim()) return;
    setSaving(true);
    try {
      await onUpdateTask(task.id, { remark: (task.remark ? task.remark + '\n' : '') + remark } as any);
      toast({ title: 'Remark added' });
      setRemark('');
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(task.id);
      toast({ title: 'Task deleted' });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="pr-8">{task.task_name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status & Priority */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{STATUS_OPTIONS.find(s => s.value === task.status)?.label}</Badge>
            <Badge className={cn(PRIORITY_COLORS[task.priority])}>{task.priority}</Badge>
            {isOverdue && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" /> Overdue
              </Badge>
            )}
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <FolderKanban className="h-4 w-4" />
              <span>{task.project?.name || 'Unknown'}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{task.assigned_to_profile?.full_name || task.assigned_to_profile?.email || 'Unassigned'}</span>
            </div>
            {task.deadline && (
              <div className={cn("flex items-center gap-2", isOverdue ? "text-destructive" : "text-muted-foreground")}>
                <Clock className="h-4 w-4" />
                <span>{format(new Date(task.deadline), 'MMM dd, yyyy hh:mm a')}</span>
              </div>
            )}
            {task.assigned_date && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Assigned: {format(new Date(task.assigned_date), 'MMM dd, yyyy')}</span>
              </div>
            )}
          </div>

          {/* Assigned by */}
          <p className="text-xs text-muted-foreground">
            Created by: {task.assigned_by_profile?.full_name || task.assigned_by_profile?.email || 'Unknown'}
          </p>

          {/* Approval info */}
          {task.approved_by && task.approved_at && (
            <div className="flex items-center gap-2 text-xs text-green-600 bg-green-500/10 p-2 rounded">
              <CheckCircle className="h-4 w-4" />
              <span>Approved on {format(new Date(task.approved_at), 'MMM dd, yyyy hh:mm a')}</span>
            </div>
          )}

          <Separator />

          {/* Remark */}
          {task.remark && (
            <div>
              <Label className="text-xs">Remarks</Label>
              <p className="text-sm bg-muted/30 rounded p-2 whitespace-pre-wrap mt-1">{task.remark}</p>
            </div>
          )}

          {/* Attachments */}
          {(task.attachments?.length || 0) > 0 && (
            <div>
              <Label className="text-xs flex items-center gap-1"><Paperclip className="h-3 w-3" /> Attachments</Label>
              <div className="mt-1 space-y-1">
                {task.attachments?.map(a => (
                  <a
                    key={a.id}
                    href={a.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline bg-muted/30 rounded px-2 py-1"
                  >
                    <Paperclip className="h-3 w-3" />
                    {a.file_name}
                  </a>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Update status */}
          {canChangeStatus && (
            <div className="space-y-2">
              <Label>Update Status</Label>
              <div className="flex gap-2">
                <Select value={newStatus} onValueChange={v => setNewStatus(v as Task['status'])}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Change status" /></SelectTrigger>
                  <SelectContent>
                    {availableStatuses.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleStatusChange} disabled={!newStatus || saving} size="sm">
                  {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  Update
                </Button>
              </div>
            </div>
          )}

          {/* Approve/Reject buttons for assigner */}
          {canApprove && task.status === 'in_review' && (
            <div className="flex gap-2">
              <Button onClick={handleApprove} disabled={saving} className="flex-1 gap-1 bg-green-600 hover:bg-green-700">
                <CheckCircle className="h-4 w-4" /> Approve
              </Button>
              <Button onClick={handleReject} disabled={saving} variant="destructive" className="flex-1 gap-1">
                <XCircle className="h-4 w-4" /> Reject
              </Button>
            </div>
          )}

          {/* Add remark */}
          <div className="space-y-2">
            <Label>Add Remark</Label>
            <Textarea value={remark} onChange={e => setRemark(e.target.value)} placeholder="Add a remark..." rows={2} />
            <Button onClick={handleSaveRemark} disabled={!remark.trim() || saving} size="sm" variant="outline">
              Add Remark
            </Button>
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          {canDelete && (
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Delete Task
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

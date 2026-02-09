import { useState, useEffect, useRef } from 'react';
import { Loader2, Upload, X, FileText, Image as ImageIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import type { Task } from '@/hooks/useTasks';

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => Promise<any>;
}

interface UserOption { id: string; full_name: string | null; email: string | null; }
interface ProjectOption { id: string; name: string; }

export default function CreateTaskDialog({ open, onOpenChange, onSubmit }: CreateTaskDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [taskName, setTaskName] = useState('');
  const [projectId, setProjectId] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<Task['priority']>('medium');
  const [remark, setRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);

  useEffect(() => {
    if (!open) return;
    // Fetch projects
    supabase.from('projects').select('id, name').order('name').then(({ data }) => {
      setProjects(data || []);
    });
    // Fetch graphic designers
    supabase.from('user_roles').select('user_id, role').eq('role', 'graphic_designer').then(async ({ data: roles }) => {
      if (!roles?.length) {
        // Also fetch all users as fallback
        const { data: allProfiles } = await supabase.from('profiles_public').select('id, full_name, email');
        setUsers(allProfiles?.map(p => ({ id: p.id!, full_name: p.full_name, email: p.email })) || []);
        return;
      }
      const ids = roles.map(r => r.user_id);
      const { data: profiles } = await supabase.from('profiles_public').select('id, full_name, email').in('id', ids);
      setUsers(profiles?.map(p => ({ id: p.id!, full_name: p.full_name, email: p.email })) || []);
    });
  }, [open]);

  const resetForm = () => {
    setTaskName('');
    setProjectId('');
    setAssignedTo('');
    setDeadline('');
    setPriority('medium');
    setRemark('');
    setFiles([]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    const valid = selected.filter(f => {
      const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!allowed.includes(f.type)) {
        toast({ title: 'Invalid file', description: `${f.name} is not JPG, PNG or PDF`, variant: 'destructive' });
        return false;
      }
      if (f.size > 10 * 1024 * 1024) {
        toast({ title: 'File too large', description: `${f.name} exceeds 10MB`, variant: 'destructive' });
        return false;
      }
      return true;
    });
    setFiles(prev => [...prev, ...valid]);
  };

  const handleSubmit = async () => {
    if (!taskName || !projectId || !assignedTo) {
      toast({ title: 'Missing fields', description: 'Please fill in required fields', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const task = await onSubmit({
        project_id: projectId,
        task_name: taskName,
        assigned_to: assignedTo,
        deadline: deadline || null,
        priority,
        remark: remark || null,
      });

      // Upload attachments
      if (task && files.length > 0) {
        for (const file of files) {
          const ext = file.name.split('.').pop();
          const path = `${user?.id}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`;
          const { error: uploadErr } = await supabase.storage.from('task-attachments').upload(path, file);
          if (uploadErr) { console.error(uploadErr); continue; }
          const { data: { publicUrl } } = supabase.storage.from('task-attachments').getPublicUrl(path);
          await supabase.from('task_attachments').insert({
            task_id: task.id,
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
            file_url: publicUrl,
            uploaded_by: user?.id,
          });
        }
      }

      toast({ title: 'Task created', description: 'Task has been assigned successfully' });
      resetForm();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Task Name *</Label>
            <Input value={taskName} onChange={e => setTaskName(e.target.value)} placeholder="Enter task name" />
          </div>

          <div>
            <Label>Project *</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
              <SelectContent>
                {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Assign To *</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger><SelectValue placeholder="Select assignee" /></SelectTrigger>
              <SelectContent>
                {users.map(u => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.full_name || u.email || 'Unknown'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Deadline</Label>
            <Input type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} />
          </div>

          <div>
            <Label>Priority</Label>
            <Select value={priority} onValueChange={v => setPriority(v as Task['priority'])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Remark</Label>
            <Textarea value={remark} onChange={e => setRemark(e.target.value)} placeholder="Add notes..." rows={3} />
          </div>

          {/* Attachments */}
          <div>
            <Label>Attachments (JPG, PNG, PDF)</Label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed rounded-lg p-3 text-center cursor-pointer hover:border-primary/50 transition-colors"
            >
              <input ref={fileInputRef} type="file" multiple accept=".jpg,.jpeg,.png,.pdf" onChange={handleFileSelect} className="hidden" />
              <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
              <p className="text-xs text-muted-foreground">Click to upload files</p>
            </div>
            {files.length > 0 && (
              <div className="mt-2 space-y-1">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm bg-muted/30 rounded px-2 py-1">
                    {f.type.includes('pdf') ? <FileText className="h-4 w-4 text-red-500" /> : <ImageIcon className="h-4 w-4 text-blue-500" />}
                    <span className="truncate flex-1">{f.name}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setFiles(files.filter((_, j) => j !== i))}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

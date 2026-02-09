import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface Task {
  id: string;
  project_id: string;
  task_name: string;
  assigned_to: string | null;
  assigned_by: string | null;
  assigned_date: string | null;
  deadline: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in_progress' | 'in_review' | 'approved' | 'rejected' | 'completed';
  remark: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  assigned_to_profile?: { full_name: string | null; email: string } | null;
  assigned_by_profile?: { full_name: string | null; email: string } | null;
  project?: { name: string; color: string | null } | null;
  attachments?: TaskAttachment[];
}

export interface TaskAttachment {
  id: string;
  task_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  uploaded_by: string | null;
  created_at: string;
}

export function useTasks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles for assigned_to and assigned_by
      const userIds = new Set<string>();
      (data || []).forEach(t => {
        if (t.assigned_to) userIds.add(t.assigned_to);
        if (t.assigned_by) userIds.add(t.assigned_by);
      });

      const { data: profiles } = await supabase
        .from('profiles_public')
        .select('id, full_name, email')
        .in('id', Array.from(userIds));

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Fetch projects
      const projectIds = new Set<string>();
      (data || []).forEach(t => projectIds.add(t.project_id));
      
      const { data: projects } = await supabase
        .from('projects')
        .select('id, name, color')
        .in('id', Array.from(projectIds));

      const projectMap = new Map(projects?.map(p => [p.id, p]) || []);

      // Fetch attachments
      const taskIds = (data || []).map(t => t.id);
      const { data: attachments } = await supabase
        .from('task_attachments')
        .select('*')
        .in('task_id', taskIds.length > 0 ? taskIds : ['none']);

      const attachmentMap = new Map<string, TaskAttachment[]>();
      (attachments || []).forEach(a => {
        const existing = attachmentMap.get(a.task_id) || [];
        existing.push(a as TaskAttachment);
        attachmentMap.set(a.task_id, existing);
      });

      const enriched: Task[] = (data || []).map(t => ({
        ...t,
        priority: t.priority as Task['priority'],
        status: t.status as Task['status'],
        assigned_to_profile: t.assigned_to ? profileMap.get(t.assigned_to) || null : null,
        assigned_by_profile: t.assigned_by ? profileMap.get(t.assigned_by) || null : null,
        project: projectMap.get(t.project_id) || null,
        attachments: attachmentMap.get(t.id) || [],
      }));

      setTasks(enriched);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const createTask = async (taskData: {
    project_id: string;
    task_name: string;
    assigned_to: string;
    deadline: string | null;
    priority: Task['priority'];
    remark: string | null;
  }) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        ...taskData,
        assigned_by: user.id,
        assigned_date: new Date().toISOString(),
        status: 'todo' as any,
        priority: taskData.priority as any,
      })
      .select()
      .single();

    if (error) throw error;
    await fetchTasks();
    return data;
  };

  const updateTaskStatus = async (taskId: string, status: Task['status']) => {
    const updateData: any = { status: status as any };
    if (status === 'approved' && user) {
      updateData.approved_by = user.id;
      updateData.approved_at = new Date().toISOString();
    }
    const { error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId);

    if (error) throw error;
    await fetchTasks();
  };

  const updateTask = async (taskId: string, data: Partial<Task>) => {
    const { error } = await supabase
      .from('tasks')
      .update(data as any)
      .eq('id', taskId);

    if (error) throw error;
    await fetchTasks();
  };

  const deleteTask = async (taskId: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) throw error;
    await fetchTasks();
  };

  return { tasks, loading, fetchTasks, createTask, updateTaskStatus, updateTask, deleteTask };
}

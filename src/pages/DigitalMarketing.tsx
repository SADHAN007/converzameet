import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Megaphone, ClipboardList, CheckCircle, Clock, AlertTriangle, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTasks, Task } from '@/hooks/useTasks';
import { useAuth } from '@/hooks/useAuth';
import TaskBoard from '@/components/tasks/TaskBoard';
import CreateTaskDialog from '@/components/tasks/CreateTaskDialog';
import TaskDetailDialog from '@/components/tasks/TaskDetailDialog';

export default function DigitalMarketing() {
  const { user, isAdmin, userRole } = useAuth();
  const { tasks, loading, createTask, updateTaskStatus, updateTask, deleteTask } = useTasks();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Filter tasks: show tasks assigned BY this user (digital marketer assigns work)
  // Admins see all tasks
  const filteredTasks = useMemo(() => {
    if (isAdmin) return tasks;
    if (!user) return [];
    return tasks.filter(t => t.assigned_by === user.id || t.assigned_to === user.id);
  }, [tasks, user, isAdmin]);

  const stats = useMemo(() => ({
    total: filteredTasks.length,
    pending: filteredTasks.filter(t => t.status === 'todo' || t.status === 'in_progress').length,
    inReview: filteredTasks.filter(t => t.status === 'in_review').length,
    approved: filteredTasks.filter(t => t.status === 'approved' || t.status === 'completed').length,
    overdue: filteredTasks.filter(t => t.deadline && new Date(t.deadline) < new Date() && !['approved', 'completed'].includes(t.status)).length,
  }), [filteredTasks]);

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setDetailOpen(true);
  };

  const canCreate = isAdmin || userRole === 'digital_marketer';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
            <Megaphone className="h-5 w-5 text-cyan-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Digital Marketing</h1>
            <p className="text-muted-foreground">Manage and assign design tasks to graphic designers</p>
          </div>
        </div>
        {canCreate && (
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Assign Task
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <ClipboardList className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Tasks</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-yellow-500/10 flex items-center justify-center">
              <Clock className="h-4 w-4 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.pending}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.approved}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.overdue}</p>
              <p className="text-xs text-muted-foreground">Overdue</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* In Review highlight */}
      {stats.inReview > 0 && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
              {stats.inReview} task{stats.inReview > 1 ? 's' : ''} awaiting review
            </Badge>
            <p className="text-sm text-muted-foreground">Tasks submitted by designers need your approval</p>
          </CardContent>
        </Card>
      )}

      {/* Task Board */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <TaskBoard tasks={filteredTasks} onTaskClick={handleTaskClick} />
      )}

      <CreateTaskDialog open={createOpen} onOpenChange={setCreateOpen} onSubmit={createTask} />
      <TaskDetailDialog
        task={selectedTask}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onUpdateStatus={updateTaskStatus}
        onUpdateTask={updateTask}
        onDelete={deleteTask}
      />
    </motion.div>
  );
}
import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Palette, ClipboardList, CheckCircle, Clock, AlertTriangle, Send } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTasks, Task } from '@/hooks/useTasks';
import { useAuth } from '@/hooks/useAuth';
import TaskBoard from '@/components/tasks/TaskBoard';
import TaskDetailDialog from '@/components/tasks/TaskDetailDialog';

export default function GraphicsDesign() {
  const { user, isAdmin } = useAuth();
  const { tasks, loading, updateTaskStatus, updateTask, deleteTask } = useTasks();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Filter tasks: show tasks assigned TO this user (graphic designer receives work)
  // Admins see all tasks
  const filteredTasks = useMemo(() => {
    if (isAdmin) return tasks;
    if (!user) return [];
    return tasks.filter(t => t.assigned_to === user.id);
  }, [tasks, user, isAdmin]);

  const stats = useMemo(() => ({
    total: filteredTasks.length,
    todo: filteredTasks.filter(t => t.status === 'todo').length,
    inProgress: filteredTasks.filter(t => t.status === 'in_progress').length,
    inReview: filteredTasks.filter(t => t.status === 'in_review').length,
    completed: filteredTasks.filter(t => t.status === 'approved' || t.status === 'completed').length,
    overdue: filteredTasks.filter(t => t.deadline && new Date(t.deadline) < new Date() && !['approved', 'completed'].includes(t.status)).length,
  }), [filteredTasks]);

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setDetailOpen(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-pink-500/10 flex items-center justify-center">
          <Palette className="h-5 w-5 text-pink-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Graphics Design</h1>
          <p className="text-muted-foreground">Your assigned design tasks and deliverables</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <ClipboardList className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Assigned</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Clock className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.todo}</p>
              <p className="text-xs text-muted-foreground">To Do</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-yellow-500/10 flex items-center justify-center">
              <Send className="h-4 w-4 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.inReview}</p>
              <p className="text-xs text-muted-foreground">Submitted</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.completed}</p>
              <p className="text-xs text-muted-foreground">Approved</p>
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

      {/* Overdue warning */}
      {stats.overdue > 0 && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">
              {stats.overdue} overdue task{stats.overdue > 1 ? 's' : ''}
            </Badge>
            <p className="text-sm text-muted-foreground">These tasks have passed their deadline</p>
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
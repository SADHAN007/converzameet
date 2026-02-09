import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, LayoutGrid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTasks, Task } from '@/hooks/useTasks';
import { useAuth } from '@/hooks/useAuth';
import TaskBoard from '@/components/tasks/TaskBoard';
import CreateTaskDialog from '@/components/tasks/CreateTaskDialog';
import TaskDetailDialog from '@/components/tasks/TaskDetailDialog';

export default function Tasks() {
  const { user, isAdmin, userRole } = useAuth();
  const { tasks, loading, createTask, updateTaskStatus, updateTask, deleteTask } = useTasks();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const canCreate = isAdmin || userRole === 'digital_marketer' || userRole === 'manager';

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Task Board</h1>
          <p className="text-muted-foreground">Manage and track design tasks</p>
        </div>
        {canCreate && (
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Task
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <TaskBoard tasks={tasks} onTaskClick={handleTaskClick} />
      )}

      <CreateTaskDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={createTask}
      />

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

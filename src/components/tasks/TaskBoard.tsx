import { AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import TaskCard from './TaskCard';
import type { Task } from '@/hooks/useTasks';

const COLUMNS: { key: Task['status']; label: string; color: string }[] = [
  { key: 'todo', label: 'To Do', color: 'border-t-muted-foreground' },
  { key: 'in_progress', label: 'In Progress', color: 'border-t-blue-500' },
  { key: 'in_review', label: 'In Review', color: 'border-t-yellow-500' },
  { key: 'approved', label: 'Approved', color: 'border-t-green-500' },
  { key: 'rejected', label: 'Rejected', color: 'border-t-red-500' },
  { key: 'completed', label: 'Completed', color: 'border-t-purple-500' },
];

interface TaskBoardProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

export default function TaskBoard({ tasks, onTaskClick }: TaskBoardProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {COLUMNS.map(col => {
        const columnTasks = tasks.filter(t => t.status === col.key);
        return (
          <div key={col.key} className="space-y-3">
            <div className={cn("border-t-4 rounded-t-md pt-2 px-1", col.color)}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">{col.label}</h3>
                <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                  {columnTasks.length}
                </span>
              </div>
            </div>
            <div className="space-y-2 min-h-[100px]">
              <AnimatePresence>
                {columnTasks.map(task => (
                  <TaskCard key={task.id} task={task} onClick={onTaskClick} />
                ))}
              </AnimatePresence>
              {columnTasks.length === 0 && (
                <div className="text-center py-6 text-xs text-muted-foreground border border-dashed rounded-lg">
                  No tasks
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

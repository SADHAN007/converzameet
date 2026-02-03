import { motion, AnimatePresence } from 'framer-motion';
import { Check, Trash2, X, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BulkActionBarProps {
  selectedCount: number;
  canApproveCount: number;
  canDeleteCount: number;
  onApprove: () => void;
  onDelete: () => void;
  onClearSelection: () => void;
  isProcessing: boolean;
}

export default function BulkActionBar({
  selectedCount,
  canApproveCount,
  canDeleteCount,
  onApprove,
  onDelete,
  onClearSelection,
  isProcessing,
}: BulkActionBarProps) {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
        >
          <div className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl",
            "bg-card border border-border",
            "backdrop-blur-lg"
          )}>
            {/* Selection Count */}
            <div className="flex items-center gap-2 pr-3 border-r border-border">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-primary" />
              </div>
              <span className="font-medium text-sm">
                {selectedCount} selected
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {canApproveCount > 0 && (
                <Button
                  size="sm"
                  onClick={onApprove}
                  disabled={isProcessing}
                  className="gap-1.5 bg-green-600 hover:bg-green-700"
                >
                  <Check className="h-4 w-4" />
                  Approve ({canApproveCount})
                </Button>
              )}

              {canDeleteCount > 0 && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={onDelete}
                  disabled={isProcessing}
                  className="gap-1.5"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete ({canDeleteCount})
                </Button>
              )}
            </div>

            {/* Clear Selection */}
            <Button
              size="icon"
              variant="ghost"
              onClick={onClearSelection}
              disabled={isProcessing}
              className="h-8 w-8 ml-1"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

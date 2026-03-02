import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { format } from 'date-fns';
import { 
  History, 
  ChevronDown, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Ban,
  RefreshCw 
} from 'lucide-react';

interface ImportRun {
  id: string;
  user_id: string;
  started_at: string;
  completed_at: string | null;
  total_rows: number;
  success_count: number;
  error_count: number;
  errors: string[];
  status: string;
  created_at: string;
}

const statusConfig: Record<string, { label: string; icon: React.ReactNode; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  completed: { label: 'Completed', icon: <CheckCircle2 className="h-3.5 w-3.5" />, variant: 'default' },
  partial: { label: 'Partial', icon: <AlertTriangle className="h-3.5 w-3.5" />, variant: 'secondary' },
  failed: { label: 'Failed', icon: <XCircle className="h-3.5 w-3.5" />, variant: 'destructive' },
  cancelled: { label: 'Cancelled', icon: <Ban className="h-3.5 w-3.5" />, variant: 'outline' },
  in_progress: { label: 'In Progress', icon: <RefreshCw className="h-3.5 w-3.5 animate-spin" />, variant: 'secondary' },
};

export function ImportRunHistory() {
  const [runs, setRuns] = useState<ImportRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchRuns = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('lead_import_runs' as any)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setRuns(data as unknown as ImportRun[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  if (loading) {
    return (
      <Card className="glass border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5" /> Import History
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass border-border/50">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg">
          <History className="h-5 w-5" /> Import History
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={fetchRuns} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {runs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No import runs yet. Import a CSV to see history here.
          </p>
        ) : (
          <div className="space-y-2">
            {runs.map((run) => {
              const config = statusConfig[run.status] || statusConfig.failed;
              const successRate = run.total_rows > 0 
                ? Math.round((run.success_count / run.total_rows) * 100) 
                : 0;
              const duration = run.completed_at && run.started_at
                ? Math.round((new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()) / 1000)
                : null;

              return (
                <Collapsible
                  key={run.id}
                  open={expandedId === run.id}
                  onOpenChange={(open) => setExpandedId(open ? run.id : null)}
                >
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/30 cursor-pointer transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <Badge variant={config.variant} className="gap-1 shrink-0">
                          {config.icon}
                          {config.label}
                        </Badge>
                        <div className="text-sm min-w-0">
                          <span className="font-medium">{run.total_rows.toLocaleString()} rows</span>
                          <span className="text-muted-foreground mx-1.5">·</span>
                          <span className="text-emerald-500 font-medium">{run.success_count.toLocaleString()}</span>
                          <span className="text-muted-foreground"> ok</span>
                          {run.error_count > 0 && (
                            <>
                              <span className="text-muted-foreground mx-1.5">·</span>
                              <span className="text-destructive font-medium">{run.error_count}</span>
                              <span className="text-muted-foreground"> errors</span>
                            </>
                          )}
                          {duration !== null && (
                            <>
                              <span className="text-muted-foreground mx-1.5">·</span>
                              <span className="text-muted-foreground">{duration}s</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground hidden sm:inline">
                          {format(new Date(run.started_at), 'MMM dd, HH:mm')}
                        </span>
                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expandedId === run.id ? 'rotate-180' : ''}`} />
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-3 pb-3 pt-1">
                      <div className="rounded-lg bg-muted/30 p-3 space-y-2">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                          <div>
                            <p className="text-muted-foreground text-xs">Started</p>
                            <p className="font-medium">{format(new Date(run.started_at), 'MMM dd, yyyy HH:mm:ss')}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Duration</p>
                            <p className="font-medium">{duration !== null ? `${duration}s` : '-'}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Success Rate</p>
                            <p className="font-medium">{successRate}%</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Failed Batches</p>
                            <p className="font-medium">{run.error_count}</p>
                          </div>
                        </div>
                        {run.errors && run.errors.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs font-medium text-destructive mb-1">Error Details:</p>
                            <div className="max-h-40 overflow-y-auto space-y-1 text-xs font-mono bg-background/50 rounded p-2 border border-border/50">
                              {run.errors.map((err, idx) => (
                                <p key={idx} className="text-destructive/80">{err}</p>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { motion } from 'framer-motion';
import { Users, Plus, Pencil } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useBillingClients } from '@/hooks/useBilling';
import CreateBillingClientDialog from '@/components/billing/CreateBillingClientDialog';
import EditBillingClientDialog from '@/components/billing/EditBillingClientDialog';
import { Navigate } from 'react-router-dom';
import { useState } from 'react';

export default function Clients() {
  const { isAdmin, userRole } = useAuth();
  const { clients } = useBillingClients();
  const [editingClient, setEditingClient] = useState<any>(null);

  const isClient = userRole === 'client';
  if (!isAdmin && !isClient) return <Navigate to="/" replace />;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Clients</h1>
            <p className="text-muted-foreground">Manage billing clients and project assignments</p>
          </div>
          {isAdmin && (
            <CreateBillingClientDialog>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Add Client</Button>
            </CreateBillingClientDialog>
          )}
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="card-hover">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Clients</p>
                  <p className="text-2xl font-bold">{clients.length}</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="card-hover">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Clients</p>
                  <p className="text-2xl font-bold">{clients.filter(c => c.is_active).length}</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="card-hover">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Inactive Clients</p>
                  <p className="text-2xl font-bold">{clients.filter(c => !c.is_active).length}</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-warning/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Clients Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card>
          <CardHeader>
            <CardTitle>All Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Projects</TableHead>
                  <TableHead>GST</TableHead>
                  <TableHead>Status</TableHead>
                  {isAdmin && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{(c as any).profiles?.full_name || '-'}</TableCell>
                    <TableCell>{c.company_name || '-'}</TableCell>
                    <TableCell>{c.billing_email || (c as any).profiles?.email || '-'}</TableCell>
                    <TableCell>{c.billing_phone || '-'}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {((c as any).assigned_projects || []).length > 0
                          ? (c as any).assigned_projects.map((p: { id: string; name: string }) => (
                              <Badge key={p.id} variant="secondary" className="text-xs">{p.name}</Badge>
                            ))
                          : <span className="text-muted-foreground text-xs">None</span>}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{c.gst_number || '-'}</TableCell>
                    <TableCell>{c.is_active ? <Badge className="bg-success/20 text-success border-0">Active</Badge> : <Badge variant="outline">Inactive</Badge>}</TableCell>
                    {isAdmin && (
                      <TableCell>
                        <Button variant="ghost" size="sm" className="gap-1" onClick={() => setEditingClient(c)}>
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {clients.length === 0 && (
                  <TableRow><TableCell colSpan={isAdmin ? 8 : 7} className="text-center text-muted-foreground py-8">No billing clients yet</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>

      <EditBillingClientDialog
        client={editingClient}
        open={!!editingClient}
        onOpenChange={(open) => { if (!open) setEditingClient(null); }}
      />
    </div>
  );
}

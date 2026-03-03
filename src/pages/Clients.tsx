import { motion } from 'framer-motion';
import { Users, Plus, Pencil, Building2, Mail, Phone, MapPin, FolderOpen, Image } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useBillingClients } from '@/hooks/useBilling';
import CreateBillingClientDialog from '@/components/billing/CreateBillingClientDialog';
import EditBillingClientDialog from '@/components/billing/EditBillingClientDialog';
import { Navigate } from 'react-router-dom';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

export default function Clients() {
  const { isAdmin, userRole } = useAuth();
  const { clients } = useBillingClients();
  const [editingClient, setEditingClient] = useState<any>(null);
  const [search, setSearch] = useState('');

  const isClient = userRole === 'client';
  if (!isAdmin && !isClient) return <Navigate to="/" replace />;

  const filtered = clients.filter(c => {
    const q = search.toLowerCase();
    if (!q) return true;
    const name = (c.company_name || (c as any).client_name || (c as any).profiles?.full_name || '').toLowerCase();
    const email = (c.billing_email || (c as any).profiles?.email || '').toLowerCase();
    return name.includes(q) || email.includes(q);
  });

  const activeCount = clients.filter(c => c.is_active).length;
  const inactiveCount = clients.filter(c => !c.is_active).length;

  const getInitials = (c: any) => {
    const name = c.company_name || c.client_name || c.profiles?.full_name || '?';
    return name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
  };

  const getDisplayName = (c: any) => c.company_name || c.client_name || c.profiles?.full_name || 'Unnamed Client';
  const getSubtitle = (c: any) => {
    if (c.company_name && (c.client_name || c.profiles?.full_name)) {
      return c.client_name || c.profiles?.full_name;
    }
    return c.billing_email || c.profiles?.email || '';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Client Dashboard</h1>
            <p className="text-muted-foreground">Manage clients, projects & billing</p>
          </div>
          {isAdmin && (
            <CreateBillingClientDialog>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Add Client</Button>
            </CreateBillingClientDialog>
          )}
        </div>
      </motion.div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Clients', value: clients.length, icon: Users, color: 'primary' },
          { label: 'Active', value: activeCount, icon: Users, color: 'success' },
          { label: 'Inactive', value: inactiveCount, icon: Users, color: 'warning' },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="card-hover border-0 shadow-sm">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{stat.label}</p>
                    <p className="text-3xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <div className={`h-11 w-11 rounded-xl bg-${stat.color}/10 flex items-center justify-center`}>
                    <stat.icon className={`h-5 w-5 text-${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Search */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </motion.div>

      {/* Client Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map((c, i) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i, duration: 0.3 }}
            whileHover={{ y: -4 }}
          >
            <Card className="overflow-hidden border-0 shadow-sm hover:shadow-lg transition-all duration-300 h-full group">
              {/* Card Top Accent */}
              <div className="h-1.5 bg-gradient-to-r from-primary via-accent to-primary/60" />

              <CardContent className="p-5 space-y-4">
                {/* Logo + Name */}
                <div className="flex items-start gap-4">
                  <Avatar className="h-14 w-14 rounded-xl border-2 border-border shadow-sm flex-shrink-0">
                    <AvatarImage src={(c as any).logo_url || (c as any).profiles?.avatar_url || ''} className="object-cover" />
                    <AvatarFallback className="rounded-xl bg-primary/10 text-primary font-bold text-lg">
                      {getInitials(c)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-base truncate">{getDisplayName(c)}</h3>
                        <p className="text-sm text-muted-foreground truncate">{getSubtitle(c)}</p>
                      </div>
                      <Badge
                        className={`flex-shrink-0 text-[10px] font-medium px-2 py-0.5 ${
                          c.is_active
                            ? 'bg-success/15 text-success border-success/30'
                            : 'bg-muted text-muted-foreground border-border'
                        }`}
                        variant="outline"
                      >
                        {c.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-1.5">
                  {(c.billing_email || (c as any).profiles?.email) && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">{c.billing_email || (c as any).profiles?.email}</span>
                    </div>
                  )}
                  {c.billing_phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>{c.billing_phone}</span>
                    </div>
                  )}
                  {(c.billing_city || c.billing_state) && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>{[c.billing_city, c.billing_state].filter(Boolean).join(', ')}</span>
                    </div>
                  )}
                </div>

                {/* Projects */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    <FolderOpen className="h-3.5 w-3.5" />
                    Projects ({((c as any).assigned_projects || []).length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {((c as any).assigned_projects || []).length > 0
                      ? (c as any).assigned_projects.slice(0, 4).map((p: { id: string; name: string }) => (
                          <Badge key={p.id} variant="secondary" className="text-xs font-normal">
                            {p.name}
                          </Badge>
                        ))
                      : <span className="text-xs text-muted-foreground italic">No projects assigned</span>
                    }
                    {((c as any).assigned_projects || []).length > 4 && (
                      <Badge variant="outline" className="text-xs">+{(c as any).assigned_projects.length - 4} more</Badge>
                    )}
                  </div>
                </div>

                {/* Billing Info Tags */}
                <div className="flex flex-wrap gap-1.5">
                  {c.gst_number && (
                    <Badge variant="outline" className="text-[10px] font-mono">
                      GST: {c.gst_number}
                    </Badge>
                  )}
                  {c.billing_frequency && c.billing_frequency !== 'one_time' && (
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {c.billing_frequency.replace(/_/g, ' ')}
                    </Badge>
                  )}
                </div>

                {/* Actions */}
                {isAdmin && (
                  <div className="pt-2 border-t border-border/60">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-xs w-full justify-center hover:bg-primary/5 hover:text-primary"
                      onClick={() => setEditingClient(c)}
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit Client
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
          <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <Building2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg mb-1">
            {search ? 'No clients found' : 'No clients yet'}
          </h3>
          <p className="text-muted-foreground text-sm">
            {search ? 'Try a different search term' : 'Add your first client to get started'}
          </p>
        </motion.div>
      )}

      <EditBillingClientDialog
        client={editingClient}
        open={!!editingClient}
        onOpenChange={(open) => { if (!open) setEditingClient(null); }}
      />
    </div>
  );
}

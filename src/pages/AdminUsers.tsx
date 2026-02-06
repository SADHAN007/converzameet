import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Users, Search, MoreVertical, Mail, Shield, ShieldCheck, UserPlus, Eye, EyeOff, Loader2, LucideIcon, UserX, UserCheck, Circle, Clock, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Navigate } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

type AppRole = 'admin' | 'manager' | 'user' | 'client' | 'bd_marketing';

interface RoleConfig {
  label: string;
  color: string;
  icon: LucideIcon;
}

const ROLE_CONFIG: Record<AppRole, RoleConfig> = {
  admin: { label: 'Admin', color: 'bg-red-500/10 text-red-600', icon: ShieldCheck },
  manager: { label: 'Manager', color: 'bg-blue-500/10 text-blue-600', icon: Shield },
  user: { label: 'User', color: 'bg-green-500/10 text-green-600', icon: Users },
  client: { label: 'Client', color: 'bg-purple-500/10 text-purple-600', icon: UserPlus },
  bd_marketing: { label: 'BD/Marketing', color: 'bg-orange-500/10 text-orange-600', icon: Users },
};

// Helper component to render role icon
const RoleIcon = ({ role, className }: { role: AppRole; className?: string }) => {
  const IconComponent = ROLE_CONFIG[role].icon;
  return <IconComponent className={className} />;
};

interface UserPresence {
  user_id: string;
  status: string;
  last_heartbeat: string;
}

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  last_seen?: string | null;
  role?: AppRole;
  is_active?: boolean;
  presence?: UserPresence | null;
}

type OnlineStatus = 'online' | 'away' | 'offline';

const OFFLINE_THRESHOLD = 60000; // 1 minute
const AWAY_THRESHOLD = 300000; // 5 minutes

const getOnlineStatus = (lastHeartbeat: string | null | undefined): OnlineStatus => {
  if (!lastHeartbeat) return 'offline';
  
  const lastSeen = new Date(lastHeartbeat).getTime();
  const now = Date.now();
  const diff = now - lastSeen;

  if (diff < OFFLINE_THRESHOLD) return 'online';
  if (diff < AWAY_THRESHOLD) return 'away';
  return 'offline';
};

const StatusIndicator = ({ status, lastSeen }: { status: OnlineStatus; lastSeen?: string | null }) => {
  const statusConfig = {
    online: { color: 'bg-emerald-500', label: 'Online', animate: true },
    away: { color: 'bg-amber-500', label: 'Away', animate: false },
    offline: { color: 'bg-muted-foreground/50', label: 'Offline', animate: false },
  };

  const config = statusConfig[status];
  const lastSeenText = lastSeen 
    ? `Last seen ${formatDistanceToNow(new Date(lastSeen), { addSuffix: true })}`
    : 'Never seen';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="relative flex items-center">
          <span className={cn(
            'h-2.5 w-2.5 rounded-full',
            config.color,
            config.animate && 'animate-pulse'
          )} />
          {config.animate && (
            <span className={cn(
              'absolute h-2.5 w-2.5 rounded-full animate-ping opacity-75',
              config.color
            )} />
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p className="font-medium">{config.label}</p>
        {status !== 'online' && <p className="text-xs text-muted-foreground">{lastSeenText}</p>}
      </TooltipContent>
    </Tooltip>
  );
};

interface Project {
  id: string;
  name: string;
  color: string;
}

export default function AdminUsers() {
  const { user, isAdmin, isLoading } = useAuth();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [assigning, setAssigning] = useState(false);
  
  // Create user state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState<AppRole>('user');
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // Toggle active state
  const [toggleDialogOpen, setToggleDialogOpen] = useState(false);
  const [userToToggle, setUserToToggle] = useState<Profile | null>(null);
  const [toggling, setToggling] = useState(false);
  
  // Delete user state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<Profile | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const fetchData = async () => {
    try {
      const [profilesRes, projectsRes, rolesRes, presenceRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('projects').select('id, name, color').order('name'),
        supabase.from('user_roles').select('user_id, role'),
        supabase.from('user_presence').select('*'),
      ]);

      if (profilesRes.data && rolesRes.data) {
        const roleMap = new Map(rolesRes.data.map(r => [r.user_id, r.role as AppRole]));
        const presenceMap = new Map(presenceRes.data?.map(p => [p.user_id, p]) || []);
        
        setProfiles(profilesRes.data.map(p => ({
          ...p,
          role: roleMap.get(p.id) || 'user',
          presence: presenceMap.get(p.id) || null,
        })));
      }
      if (projectsRes.data) setProjects(projectsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Subscribe to realtime presence updates
  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel('user-presence-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence',
        },
        (payload) => {
          const updatedPresence = payload.new as UserPresence;
          setProfiles(prev => prev.map(p => 
            p.id === updatedPresence.user_id 
              ? { ...p, presence: updatedPresence }
              : p
          ));
        }
      )
      .subscribe();

    // Refresh presence data every 30 seconds
    const refreshInterval = setInterval(() => {
      supabase.from('user_presence').select('*').then(({ data }) => {
        if (data) {
          const presenceMap = new Map(data.map(p => [p.user_id, p]));
          setProfiles(prev => prev.map(p => ({
            ...p,
            presence: presenceMap.get(p.id) || p.presence,
          })));
        }
      });
    }, 30000);

    return () => {
      channel.unsubscribe();
      clearInterval(refreshInterval);
    };
  }, [isAdmin]);

  const handleAssignToProject = async () => {
    if (!selectedUser || !selectedProjectId) return;

    setAssigning(true);
    try {
      const { error } = await supabase.from('project_members').insert({
        project_id: selectedProjectId,
        user_id: selectedUser.id,
        role: 'member',
      });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: 'Already assigned',
            description: 'This user is already a member of this project',
            variant: 'destructive',
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: 'User assigned',
          description: 'User has been added to the project',
        });
        setAssignDialogOpen(false);
        setSelectedUser(null);
        setSelectedProjectId('');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to assign user',
        variant: 'destructive',
      });
    } finally {
      setAssigning(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newEmail || !newPassword) return;

    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: newEmail,
          password: newPassword,
          fullName: newFullName || newEmail.split('@')[0],
          role: newRole,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: 'User created',
        description: `${newEmail} has been created as ${newRole}`,
      });

      setCreateDialogOpen(false);
      setNewEmail('');
      setNewPassword('');
      setNewFullName('');
      setNewRole('user');
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create user',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleChangeRole = async (userId: string, newRole: AppRole) => {
    try {
      // Delete existing role and insert new one
      await supabase.from('user_roles').delete().eq('user_id', userId);
      await supabase.from('user_roles').insert({ user_id: userId, role: newRole });

      setProfiles(profiles.map(p => 
        p.id === userId ? { ...p, role: newRole } : p
      ));

      toast({
        title: 'Role updated',
        description: `User role changed to ${ROLE_CONFIG[newRole].label}`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update role',
        variant: 'destructive',
      });
    }
  };

  const handleToggleActive = async () => {
    if (!userToToggle) return;

    setToggling(true);
    try {
      const newStatus = !userToToggle.is_active;
      
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: newStatus })
        .eq('id', userToToggle.id);

      if (error) throw error;

      setProfiles(profiles.map(p => 
        p.id === userToToggle.id ? { ...p, is_active: newStatus } : p
      ));
      
      toast({
        title: newStatus ? 'User activated' : 'User deactivated',
        description: `${userToToggle.email} has been ${newStatus ? 'activated' : 'deactivated'}`,
      });
      setToggleDialogOpen(false);
      setUserToToggle(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update user status',
        variant: 'destructive',
      });
    } finally {
      setToggling(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          action: 'delete',
          userId: userToDelete.id,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setProfiles(profiles.filter(p => p.id !== userToDelete.id));
      
      toast({
        title: 'User deleted',
        description: `${userToDelete.email} has been permanently deleted`,
      });
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete user',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  const filteredProfiles = profiles.filter(p =>
    p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Manage users and their project assignments</p>
        </div>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Create User</span>
            <span className="sm:hidden">Create</span>
          </Button>
        </motion.div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* User list */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : filteredProfiles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No users found</h3>
            <p className="text-muted-foreground">
              {searchQuery ? 'Try adjusting your search' : 'Users will appear here when they sign up'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredProfiles.map((profile, index) => (
            <motion.div
              key={profile.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="card-hover group">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      {/* Avatar with status indicator */}
                      <div className="relative flex-shrink-0">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {getInitials(profile.full_name, profile.email)}
                          </AvatarFallback>
                        </Avatar>
                        {/* Status indicator positioned at bottom-right of avatar */}
                        <div className="absolute -bottom-0.5 -right-0.5 p-0.5 bg-card rounded-full">
                          <StatusIndicator 
                            status={getOnlineStatus(profile.presence?.last_heartbeat)} 
                            lastSeen={profile.presence?.last_heartbeat || profile.last_seen}
                          />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className={`font-semibold truncate ${profile.is_active === false ? 'text-muted-foreground' : 'text-foreground'}`}>
                            {profile.full_name || profile.email.split('@')[0]}
                          </h3>
                          {profile.role && (
                            <Badge className={ROLE_CONFIG[profile.role].color}>
                              <RoleIcon role={profile.role} className="h-3 w-3 mr-1" />
                              {ROLE_CONFIG[profile.role].label}
                            </Badge>
                          )}
                          {profile.is_active === false && (
                            <Badge variant="outline" className="border-destructive/50 text-destructive">
                              <UserX className="h-3 w-3 mr-1" />
                              Inactive
                            </Badge>
                          )}
                          {profile.id === user?.id && (
                            <Badge variant="secondary">You</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                          <Mail className="h-3.5 w-3.5" />
                          <span className="truncate">{profile.email}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span>Joined {format(new Date(profile.created_at), 'MMM d, yyyy')}</span>
                          {profile.presence?.last_heartbeat && getOnlineStatus(profile.presence.last_heartbeat) !== 'online' && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDistanceToNow(new Date(profile.presence.last_heartbeat), { addSuffix: true })}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(profile);
                          setAssignDialogOpen(true);
                        }}
                        className="text-xs sm:text-sm"
                      >
                        <UserPlus className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Assign to Project</span>
                      </Button>
                      {profile.id !== user?.id && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                              Change Role
                            </div>
                            <DropdownMenuSeparator />
                            {(Object.keys(ROLE_CONFIG) as AppRole[]).map((role) => {
                              const config = ROLE_CONFIG[role];
                              const isCurrentRole = profile.role === role;
                              return (
                                <DropdownMenuItem 
                                  key={role}
                                  onClick={() => !isCurrentRole && handleChangeRole(profile.id, role)}
                                  disabled={isCurrentRole}
                                  className={isCurrentRole ? 'bg-accent' : ''}
                                >
                                  <RoleIcon role={role} className="h-4 w-4 mr-2" />
                                  {config.label}
                                  {isCurrentRole && <span className="ml-auto text-xs text-muted-foreground">Current</span>}
                                </DropdownMenuItem>
                              );
                            })}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setUserToToggle(profile);
                                setToggleDialogOpen(true);
                              }}
                            >
                              {profile.is_active !== false ? (
                                <>
                                  <UserX className="h-4 w-4 mr-2" />
                                  Deactivate User
                                </>
                              ) : (
                                <>
                                  <UserCheck className="h-4 w-4 mr-2" />
                                  Activate User
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setUserToDelete(profile);
                                setDeleteDialogOpen(true);
                              }}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Assign to project dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign User to Project</DialogTitle>
            <DialogDescription>
              Select a project to add {selectedUser?.full_name || selectedUser?.email} as a member.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="project-select">Project</Label>
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: project.color }}
                      />
                      {project.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignToProject} disabled={!selectedProjectId || assigning}>
              {assigning ? 'Assigning...' : 'Assign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create user dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Create New User
            </DialogTitle>
            <DialogDescription>
              Add a new user to the system. They can log in immediately after creation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                placeholder="John Doe"
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ROLE_CONFIG) as AppRole[]).map((role) => (
                    <SelectItem key={role} value={role}>
                      <div className="flex items-center gap-2">
                        <RoleIcon role={role} className="h-4 w-4" />
                        {ROLE_CONFIG[role].label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button 
              onClick={handleCreateUser} 
              disabled={!newEmail || !newPassword || creating}
              className="w-full sm:w-auto gap-2"
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Create User
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toggle active status confirmation dialog */}
      <AlertDialog open={toggleDialogOpen} onOpenChange={setToggleDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {userToToggle?.is_active !== false ? 'Deactivate User' : 'Activate User'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {userToToggle?.is_active !== false 
                ? `Are you sure you want to deactivate ${userToToggle?.full_name || userToToggle?.email}? They will no longer be able to log in.`
                : `Are you sure you want to activate ${userToToggle?.full_name || userToToggle?.email}? They will be able to log in again.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={toggling}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleActive}
              disabled={toggling}
              className={userToToggle?.is_active !== false 
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" 
                : ""
              }
            >
              {toggling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {userToToggle?.is_active !== false ? 'Deactivating...' : 'Activating...'}
                </>
              ) : (
                <>
                  {userToToggle?.is_active !== false ? (
                    <><UserX className="h-4 w-4 mr-2" />Deactivate</>
                  ) : (
                    <><UserCheck className="h-4 w-4 mr-2" />Activate</>
                  )}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete user confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Delete User Permanently
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Are you sure you want to permanently delete <strong>{userToDelete?.full_name || userToDelete?.email}</strong>?
              </p>
              <p className="text-destructive font-medium">
                This action cannot be undone. All user data, roles, and project memberships will be removed.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Permanently
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}

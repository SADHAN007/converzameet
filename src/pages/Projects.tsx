import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Plus, FolderKanban, Search, Users, MoreVertical, Trash2, Edit, UserPlus, X, Camera, ImageIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Project {
  id: string;
  name: string;
  description: string | null;
  color: string;
  logo_url: string | null;
  created_at: string;
  member_count?: number;
}

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
}

interface ProjectMember {
  id: string;
  user_id: string;
  role: string;
  profile: UserProfile;
}

const colors = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f97316', 
  '#10b981', '#06b6d4', '#6366f1', '#f43f5e'
];

export default function Projects() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '', color: colors[0] });
  const [creating, setCreating] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Add member state
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, [user]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(fetchProjects, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  const fetchProjects = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          project_members(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const projectsWithCount = data?.map(p => ({
        ...p,
        member_count: (p.project_members as any)?.[0]?.count || 0
      })) || [];

      setProjects(projectsWithCount);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast({
        title: 'Error',
        description: 'Failed to load projects',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please select an image file', variant: 'destructive' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Logo must be under 2MB', variant: 'destructive' });
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const uploadLogo = async (projectId: string, file: File): Promise<string | null> => {
    const ext = file.name.split('.').pop();
    const path = `${projectId}/logo.${ext}`;
    const { error } = await supabase.storage.from('project-logos').upload(path, file, { upsert: true });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('project-logos').getPublicUrl(path);
    return urlData.publicUrl;
  };

  const handleCreateProject = async () => {
    if (!newProject.name.trim()) {
      toast({ title: 'Name required', description: 'Please enter a project name', variant: 'destructive' });
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          name: newProject.name.trim(),
          description: newProject.description.trim() || null,
          color: newProject.color,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      let logoUrl: string | null = null;
      if (logoFile) {
        logoUrl = await uploadLogo(data.id, logoFile);
        await supabase.from('projects').update({ logo_url: logoUrl }).eq('id', data.id);
      }

      setProjects([{ ...data, logo_url: logoUrl, member_count: 0 }, ...projects]);
      setNewProject({ name: '', description: '', color: colors[0] });
      setLogoFile(null);
      setLogoPreview(null);
      setCreateDialogOpen(false);
      toast({ title: 'Project created', description: 'Your new project is ready' });
    } catch (error: any) {
      console.error('Error creating project:', error);
      toast({ title: 'Error', description: error.message || 'Failed to create project', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;

      setProjects(projects.filter(p => p.id !== projectId));
      toast({
        title: 'Project deleted',
        description: 'The project has been removed',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete project',
        variant: 'destructive',
      });
    }
  };

  const openMemberDialog = async (project: Project) => {
    setSelectedProject(project);
    setMemberDialogOpen(true);
    setLoadingMembers(true);
    setSelectedUserId('');

    try {
      // Fetch current members and all users in parallel
      const [membersRes, usersRes] = await Promise.all([
        supabase
          .from('project_members')
          .select('id, user_id, role')
          .eq('project_id', project.id),
        supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .order('full_name'),
      ]);

      const members = membersRes.data || [];
      const users = usersRes.data || [];

      // Map members with profile data
      const membersWithProfiles: ProjectMember[] = members.map(m => ({
        ...m,
        profile: users.find(u => u.id === m.user_id) || { id: m.user_id, full_name: null, email: '', avatar_url: null },
      }));

      setProjectMembers(membersWithProfiles);
      setAllUsers(users);
    } catch (error) {
      console.error('Error loading members:', error);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleAddMember = async () => {
    if (!selectedProject || !selectedUserId) return;

    setAddingMember(true);
    try {
      const { error } = await supabase.from('project_members').insert({
        project_id: selectedProject.id,
        user_id: selectedUserId,
        role: 'member',
      });

      if (error) {
        if (error.code === '23505') {
          toast({ title: 'Already a member', description: 'This user is already in the project', variant: 'destructive' });
        } else {
          throw error;
        }
      } else {
        toast({ title: 'Member added', description: 'User has been added to the project' });
        // Refresh members list and project count
        await openMemberDialog(selectedProject);
        fetchProjects();
      }
      setSelectedUserId('');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to add member', variant: 'destructive' });
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!selectedProject) return;

    try {
      const { error } = await supabase.from('project_members').delete().eq('id', memberId);
      if (error) throw error;

      toast({ title: 'Member removed', description: 'User has been removed from the project' });
      await openMemberDialog(selectedProject);
      fetchProjects();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to remove member', variant: 'destructive' });
    }
  };

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const memberUserIds = new Set(projectMembers.map(m => m.user_id));
  const availableUsers = allUsers.filter(u => !memberUserIds.has(u.id));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
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
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-muted-foreground">Manage your project workspaces</p>
        </div>
        {isAdmin && (
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
                <DialogDescription>
                  Add a new project to organize your team's work.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Project Name</Label>
                  <Input
                    id="name"
                    placeholder="Enter project name"
                    value={newProject.name}
                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of the project"
                    value={newProject.description}
                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Color</Label>
                  <div className="flex gap-2">
                    {colors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewProject({ ...newProject, color })}
                        className={`h-8 w-8 rounded-full transition-all ${
                          newProject.color === color ? 'ring-2 ring-offset-2 ring-primary' : ''
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Project Logo</Label>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoSelect}
                  />
                  <div
                    onClick={() => logoInputRef.current?.click()}
                    className="relative cursor-pointer group/logo border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-all hover:bg-primary/5"
                  >
                    {logoPreview ? (
                      <div className="relative">
                        <img src={logoPreview} alt="Logo preview" className="h-20 w-20 rounded-xl object-cover shadow-md" />
                        <div className="absolute inset-0 rounded-xl bg-black/40 opacity-0 group-hover/logo:opacity-100 transition-opacity flex items-center justify-center">
                          <Camera className="h-5 w-5 text-white" />
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="h-14 w-14 rounded-xl bg-muted flex items-center justify-center">
                          <ImageIcon className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p className="text-xs text-muted-foreground">Click to upload logo (max 2MB)</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateProject} disabled={creating}>
                  {creating ? 'Creating...' : 'Create Project'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search projects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Projects grid */}
      {filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderKanban className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No projects found</h3>
            <p className="text-muted-foreground text-center max-w-sm">
              {searchQuery
                ? 'Try adjusting your search query'
                : isAdmin
                ? 'Create your first project to get started'
                : 'No projects have been assigned to you yet'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="card-hover group">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div
                        className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden shadow-sm"
                        style={{ backgroundColor: project.logo_url ? 'transparent' : project.color }}
                      >
                        {project.logo_url ? (
                          <img src={project.logo_url} alt={project.name} className="h-full w-full object-cover rounded-lg" />
                        ) : (
                          <FolderKanban className="h-5 w-5 text-white" />
                        )}
                      </div>
                      <div>
                        <Link to={`/projects/${project.id}`}>
                          <CardTitle className="text-base hover:text-primary transition-colors">
                            {project.name}
                          </CardTitle>
                        </Link>
                        <CardDescription className="line-clamp-2 mt-1">
                          {project.description || 'No description'}
                        </CardDescription>
                      </div>
                    </div>
                    {isAdmin && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openMemberDialog(project)}>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Manage Members
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDeleteProject(project.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <button
                      onClick={() => isAdmin && openMemberDialog(project)}
                      className={`flex items-center gap-1 ${isAdmin ? 'hover:text-primary cursor-pointer' : ''}`}
                    >
                      <Users className="h-4 w-4" />
                      <span>{project.member_count} members</span>
                    </button>
                    <span>{format(new Date(project.created_at), 'MMM d, yyyy')}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Manage Members Dialog */}
      <Dialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Manage Members — {selectedProject?.name}
            </DialogTitle>
            <DialogDescription>
              Add or remove users from this project.
            </DialogDescription>
          </DialogHeader>

          {/* Add member */}
          <div className="flex gap-2">
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select a user to add" />
              </SelectTrigger>
              <SelectContent>
                {availableUsers.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.full_name || u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleAddMember} disabled={!selectedUserId || addingMember} size="sm">
              <UserPlus className="h-4 w-4 mr-1" />
              {addingMember ? 'Adding...' : 'Add'}
            </Button>
          </div>

          {/* Members list */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {loadingMembers ? (
              <div className="flex justify-center py-4">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : projectMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No members yet</p>
            ) : (
              projectMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-2 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={member.profile.avatar_url || ''} />
                      <AvatarFallback className="text-xs">
                        {(member.profile.full_name || member.profile.email || '?').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{member.profile.full_name || member.profile.email}</p>
                      <p className="text-xs text-muted-foreground">{member.profile.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">{member.role}</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => handleRemoveMember(member.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

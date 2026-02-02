import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, FolderKanban, Search, Users, MoreVertical, Trash2, Edit } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

interface Project {
  id: string;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
  member_count?: number;
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

  useEffect(() => {
    fetchProjects();
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

  const handleCreateProject = async () => {
    if (!newProject.name.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a project name',
        variant: 'destructive',
      });
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

      setProjects([{ ...data, member_count: 0 }, ...projects]);
      setNewProject({ name: '', description: '', color: colors[0] });
      setCreateDialogOpen(false);
      toast({
        title: 'Project created',
        description: 'Your new project is ready',
      });
    } catch (error: any) {
      console.error('Error creating project:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create project',
        variant: 'destructive',
      });
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

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
                        className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: project.color }}
                      >
                        <FolderKanban className="h-5 w-5 text-white" />
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
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{project.member_count} members</span>
                    </div>
                    <span>{format(new Date(project.created_at), 'MMM d, yyyy')}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

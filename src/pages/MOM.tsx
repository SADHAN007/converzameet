import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, FileText, Search, Calendar, User, Edit, Trash2, Eye } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface MOM {
  id: string;
  title: string;
  content: any;
  created_at: string;
  updated_at: string;
  project_id: string;
  created_by: string | null;
  projects?: { name: string; color: string };
  profiles?: { full_name: string | null; email: string };
}

interface Project {
  id: string;
  name: string;
  color: string;
}

export default function MOMPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [moms, setMoms] = useState<MOM[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedMom, setSelectedMom] = useState<MOM | null>(null);
  const [newMom, setNewMom] = useState({
    title: '',
    project_id: '',
    content: '',
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      const [momsRes, projectsRes] = await Promise.all([
        supabase
          .from('moms')
          .select('*, projects(name, color)')
          .order('created_at', { ascending: false }),
        supabase.from('projects').select('id, name, color').order('name'),
      ]);

      if (momsRes.data) {
        // Fetch profiles for creators
        const creatorIds = momsRes.data.filter(m => m.created_by).map(m => m.created_by as string);
        const uniqueCreatorIds = [...new Set(creatorIds)];
        let profilesMap = new Map<string, { full_name: string | null; email: string }>();
        
        if (uniqueCreatorIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', uniqueCreatorIds);
          
          if (profilesData) {
            profilesMap = new Map(profilesData.map(p => [p.id, { full_name: p.full_name, email: p.email }]));
          }
        }
        
        setMoms(momsRes.data.map(m => ({
          ...m,
          content: m.content as any,
          projects: m.projects as { name: string; color: string } | undefined,
          profiles: m.created_by ? profilesMap.get(m.created_by) : undefined
        })));
      }
      if (projectsRes.data) setProjects(projectsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMom = async () => {
    if (!newMom.title.trim() || !newMom.project_id) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in title and select a project',
        variant: 'destructive',
      });
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('moms')
        .insert({
          title: newMom.title.trim(),
          project_id: newMom.project_id,
          content: { text: newMom.content.trim() },
          created_by: user?.id,
        })
        .select('*, projects(name, color)')
        .single();

      if (error) throw error;

      if (data) {
        // Get profile for current user
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', user?.id)
          .single();

        setMoms([{
          ...data,
          projects: data.projects as { name: string; color: string } | undefined,
          profiles: profile || undefined
        }, ...moms]);
      }
      setNewMom({ title: '', project_id: '', content: '' });
      setCreateDialogOpen(false);
      toast({
        title: 'MOM created',
        description: 'Meeting minutes have been saved',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create MOM',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteMom = async (id: string) => {
    try {
      const { error } = await supabase.from('moms').delete().eq('id', id);
      if (error) throw error;

      setMoms(moms.filter(m => m.id !== id));
      toast({
        title: 'MOM deleted',
        description: 'Meeting minutes have been removed',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete MOM',
        variant: 'destructive',
      });
    }
  };

  const filteredMoms = moms.filter(m => {
    const matchesSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProject = selectedProject === 'all' || m.project_id === selectedProject;
    return matchesSearch && matchesProject;
  });

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
          <h1 className="text-2xl font-bold">Meeting Minutes</h1>
          <p className="text-muted-foreground">Create and manage your MOMs</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New MOM
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Meeting Minutes</DialogTitle>
              <DialogDescription>
                Document your meeting discussions and action items.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="mom-title">Title *</Label>
                <Input
                  id="mom-title"
                  placeholder="e.g., Sprint Planning - Week 12"
                  value={newMom.title}
                  onChange={(e) => setNewMom({ ...newMom, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mom-project">Project *</Label>
                <Select
                  value={newMom.project_id}
                  onValueChange={(value) => setNewMom({ ...newMom, project_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
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
              <div className="space-y-2">
                <Label htmlFor="mom-content">Content</Label>
                <Textarea
                  id="mom-content"
                  placeholder="Write your meeting notes here...

• Discussion points
• Decisions made
• Action items
• Next steps"
                  value={newMom.content}
                  onChange={(e) => setNewMom({ ...newMom, content: e.target.value })}
                  rows={10}
                  className="font-mono text-sm"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateMom} disabled={creating}>
                {creating ? 'Creating...' : 'Create MOM'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search meeting minutes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
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

      {/* MOM list */}
      {filteredMoms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No meeting minutes found</h3>
            <p className="text-muted-foreground text-center max-w-sm">
              {searchQuery || selectedProject !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first MOM to document meeting discussions'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredMoms.map((mom, index) => (
            <motion.div
              key={mom.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="card-hover group">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div
                        className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: mom.projects?.color || '#3b82f6' }}
                      >
                        <FileText className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate">{mom.title}</h3>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
                          {mom.projects && (
                            <Badge variant="secondary">{mom.projects.name}</Badge>
                          )}
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>{format(new Date(mom.created_at), 'MMM d, yyyy')}</span>
                          </div>
                          {mom.profiles && (
                            <div className="flex items-center gap-1">
                              <User className="h-3.5 w-3.5" />
                              <span>{mom.profiles.full_name || mom.profiles.email.split('@')[0]}</span>
                            </div>
                          )}
                        </div>
                        {mom.content?.text && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {mom.content.text}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedMom(mom);
                          setViewDialogOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteMom(mom.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* View dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedMom && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div
                    className="h-8 w-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: selectedMom.projects?.color || '#3b82f6' }}
                  >
                    <FileText className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <DialogTitle>{selectedMom.title}</DialogTitle>
                    <DialogDescription>
                      {selectedMom.projects?.name} • {format(new Date(selectedMom.created_at), 'MMMM d, yyyy')}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="py-4">
                <div className="prose prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-sm text-foreground bg-muted p-4 rounded-lg">
                    {selectedMom.content?.text || 'No content'}
                  </pre>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

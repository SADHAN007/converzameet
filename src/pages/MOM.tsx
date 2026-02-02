import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, FileText, Search, Calendar, User, Edit, Trash2, Eye, Users, Check, X, UserPlus } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface MOMParticipant {
  id: string;
  user_id: string;
  has_agreed: boolean;
  agreed_at: string | null;
  profiles?: { 
    full_name: string | null; 
    email: string;
    avatar_url: string | null;
  };
}

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
  participants?: MOMParticipant[];
}

interface Project {
  id: string;
  name: string;
  color: string;
}

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
}

export default function MOMPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [moms, setMoms] = useState<MOM[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedMom, setSelectedMom] = useState<MOM | null>(null);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
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
      const [momsRes, projectsRes, profilesRes] = await Promise.all([
        supabase
          .from('moms')
          .select('*, projects(name, color)')
          .order('created_at', { ascending: false }),
        supabase.from('projects').select('id, name, color').order('name'),
        supabase.from('profiles').select('id, full_name, email, avatar_url').order('full_name'),
      ]);

      if (profilesRes.data) setAllProfiles(profilesRes.data);

      if (momsRes.data) {
        // Fetch participants for each MOM
        const momIds = momsRes.data.map(m => m.id);
        const { data: participantsData } = await supabase
          .from('mom_participants')
          .select('*')
          .in('mom_id', momIds);

        // Create profiles map
        const creatorIds = momsRes.data.filter(m => m.created_by).map(m => m.created_by as string);
        const participantUserIds = participantsData?.map(p => p.user_id) || [];
        const allUserIds = [...new Set([...creatorIds, ...participantUserIds])];
        
        let profilesMap = new Map<string, { full_name: string | null; email: string; avatar_url: string | null }>();
        
        if (allUserIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, full_name, email, avatar_url')
            .in('id', allUserIds);
          
          if (profilesData) {
            profilesMap = new Map(profilesData.map(p => [p.id, { full_name: p.full_name, email: p.email, avatar_url: p.avatar_url }]));
          }
        }
        
        // Group participants by mom_id
        const participantsByMom = new Map<string, MOMParticipant[]>();
        participantsData?.forEach(p => {
          const existing = participantsByMom.get(p.mom_id) || [];
          existing.push({
            ...p,
            profiles: profilesMap.get(p.user_id)
          });
          participantsByMom.set(p.mom_id, existing);
        });

        setMoms(momsRes.data.map(m => ({
          ...m,
          content: m.content as any,
          projects: m.projects as { name: string; color: string } | undefined,
          profiles: m.created_by ? profilesMap.get(m.created_by) : undefined,
          participants: participantsByMom.get(m.id) || []
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

      // Add participants
      if (data && selectedParticipants.length > 0) {
        const participantsToInsert = selectedParticipants.map(userId => ({
          mom_id: data.id,
          user_id: userId,
        }));

        const { error: participantsError } = await supabase
          .from('mom_participants')
          .insert(participantsToInsert);

        if (participantsError) {
          console.error('Error adding participants:', participantsError);
        }
      }

      if (data) {
        // Get profile for current user
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email, avatar_url')
          .eq('id', user?.id)
          .maybeSingle();

        // Get participant profiles
        const participantProfiles = selectedParticipants.map(userId => {
          const p = allProfiles.find(prof => prof.id === userId);
          return {
            id: '',
            user_id: userId,
            has_agreed: false,
            agreed_at: null,
            profiles: p ? { full_name: p.full_name, email: p.email, avatar_url: p.avatar_url } : undefined
          };
        });

        setMoms([{
          ...data,
          projects: data.projects as { name: string; color: string } | undefined,
          profiles: profile || undefined,
          participants: participantProfiles
        }, ...moms]);
      }
      setNewMom({ title: '', project_id: '', content: '' });
      setSelectedParticipants([]);
      setCreateDialogOpen(false);
      toast({
        title: 'MOM created',
        description: 'Meeting minutes have been saved and participants notified',
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

  const handleAgree = async (momId: string) => {
    try {
      const { error } = await supabase
        .from('mom_participants')
        .update({ 
          has_agreed: true, 
          agreed_at: new Date().toISOString() 
        })
        .eq('mom_id', momId)
        .eq('user_id', user?.id);

      if (error) throw error;

      // Update local state
      setMoms(moms.map(m => {
        if (m.id === momId) {
          return {
            ...m,
            participants: m.participants?.map(p => 
              p.user_id === user?.id 
                ? { ...p, has_agreed: true, agreed_at: new Date().toISOString() }
                : p
            )
          };
        }
        return m;
      }));

      // Update selected mom if open
      if (selectedMom?.id === momId) {
        setSelectedMom({
          ...selectedMom,
          participants: selectedMom.participants?.map(p => 
            p.user_id === user?.id 
              ? { ...p, has_agreed: true, agreed_at: new Date().toISOString() }
              : p
          )
        });
      }

      toast({
        title: 'Agreement recorded',
        description: 'Your agreement has been saved',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to record agreement',
        variant: 'destructive',
      });
    }
  };

  const toggleParticipant = (userId: string) => {
    setSelectedParticipants(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  const isUserParticipant = (mom: MOM) => {
    return mom.participants?.some(p => p.user_id === user?.id);
  };

  const hasUserAgreed = (mom: MOM) => {
    return mom.participants?.find(p => p.user_id === user?.id)?.has_agreed;
  };

  const getAgreementStats = (participants: MOMParticipant[] | undefined) => {
    if (!participants || participants.length === 0) return { agreed: 0, total: 0 };
    const agreed = participants.filter(p => p.has_agreed).length;
    return { agreed, total: participants.length };
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
              
              {/* Participants Selection */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Tag Participants
                </Label>
                <p className="text-sm text-muted-foreground">
                  Select users who will need to acknowledge this MOM
                </p>
                <ScrollArea className="h-48 border rounded-md p-2">
                  <div className="space-y-2">
                    {allProfiles
                      .filter(p => p.id !== user?.id)
                      .map((profile) => (
                      <div
                        key={profile.id}
                        className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer"
                        onClick={() => toggleParticipant(profile.id)}
                      >
                        <Checkbox
                          checked={selectedParticipants.includes(profile.id)}
                          onCheckedChange={() => toggleParticipant(profile.id)}
                        />
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={profile.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {getInitials(profile.full_name, profile.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {profile.full_name || profile.email.split('@')[0]}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {profile.email}
                          </p>
                        </div>
                      </div>
                    ))}
                    {allProfiles.filter(p => p.id !== user?.id).length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No other users available
                      </p>
                    )}
                  </div>
                </ScrollArea>
                {selectedParticipants.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {selectedParticipants.map(id => {
                      const profile = allProfiles.find(p => p.id === id);
                      return profile ? (
                        <Badge 
                          key={id} 
                          variant="secondary"
                          className="gap-1"
                        >
                          {profile.full_name || profile.email.split('@')[0]}
                          <X 
                            className="h-3 w-3 cursor-pointer" 
                            onClick={() => toggleParticipant(id)}
                          />
                        </Badge>
                      ) : null;
                    })}
                  </div>
                )}
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
          {filteredMoms.map((mom, index) => {
            const stats = getAgreementStats(mom.participants);
            const canAgree = isUserParticipant(mom) && !hasUserAgreed(mom);
            
            return (
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
                          
                          {/* Participants and Agreement Status */}
                          {mom.participants && mom.participants.length > 0 && (
                            <div className="flex items-center gap-3 mt-2">
                              <TooltipProvider>
                                <div className="flex items-center gap-2">
                                  <div className="flex -space-x-2">
                                    {mom.participants.slice(0, 5).map((participant) => (
                                      <Tooltip key={participant.user_id}>
                                        <TooltipTrigger asChild>
                                          <Avatar className={`h-6 w-6 border-2 ${participant.has_agreed ? 'border-green-500' : 'border-background'}`}>
                                            <AvatarImage src={participant.profiles?.avatar_url || undefined} />
                                            <AvatarFallback className="text-xs">
                                              {getInitials(participant.profiles?.full_name || null, participant.profiles?.email || '')}
                                            </AvatarFallback>
                                          </Avatar>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>
                                            {participant.profiles?.full_name || participant.profiles?.email?.split('@')[0]}
                                            {participant.has_agreed && ' ✓ Agreed'}
                                          </p>
                                        </TooltipContent>
                                      </Tooltip>
                                    ))}
                                    {mom.participants.length > 5 && (
                                      <Avatar className="h-6 w-6 border-2 border-background">
                                        <AvatarFallback className="text-xs bg-muted">
                                          +{mom.participants.length - 5}
                                        </AvatarFallback>
                                      </Avatar>
                                    )}
                                  </div>
                                  <Badge variant={stats.agreed === stats.total ? "default" : "outline"} className="text-xs gap-1 shrink-0">
                                    <Check className="h-3 w-3" />
                                    {stats.agreed}/{stats.total}
                                  </Badge>
                                </div>
                              </TooltipProvider>
                              
                              {canAgree && (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="h-7 text-xs gap-1 text-green-600 border-green-600 hover:bg-green-50"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAgree(mom.id);
                                  }}
                                >
                                  <Check className="h-3 w-3" />
                                  Agree
                                </Button>
                              )}
                            </div>
                          )}
                          
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
            );
          })}
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
              
              {/* Participants Section */}
              {selectedMom.participants && selectedMom.participants.length > 0 && (
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Participants
                    </h4>
                    {(() => {
                      const stats = getAgreementStats(selectedMom.participants);
                      return (
                        <Badge variant={stats.agreed === stats.total ? "default" : "secondary"}>
                          {stats.agreed}/{stats.total} agreed
                        </Badge>
                      );
                    })()}
                  </div>
                  <div className="space-y-2">
                    {selectedMom.participants.map((participant) => (
                      <div 
                        key={participant.user_id}
                        className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={participant.profiles?.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {getInitials(participant.profiles?.full_name || null, participant.profiles?.email || '')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">
                              {participant.profiles?.full_name || participant.profiles?.email?.split('@')[0]}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {participant.profiles?.email}
                            </p>
                          </div>
                        </div>
                        {participant.has_agreed ? (
                          <Badge variant="default" className="gap-1 [&]:bg-green-600 [&]:hover:bg-green-600/90">
                            <Check className="h-3 w-3" />
                            Agreed
                            {participant.agreed_at && (
                              <span className="text-xs opacity-75">
                                • {format(new Date(participant.agreed_at), 'MMM d')}
                              </span>
                            )}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            Pending
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {/* Agree Button for Current User */}
                  {isUserParticipant(selectedMom) && !hasUserAgreed(selectedMom) && (
                    <Button 
                      className="w-full gap-2" 
                      onClick={() => handleAgree(selectedMom.id)}
                    >
                      <Check className="h-4 w-4" />
                      I Agree to this MOM
                    </Button>
                  )}
                </div>
              )}

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
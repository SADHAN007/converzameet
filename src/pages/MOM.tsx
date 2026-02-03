import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, FileText, Search, Calendar, User, Edit, Trash2, Eye, Users, Check, X, Send, Clock, CheckCircle2, Download, AlertCircle, Table2, Paperclip, Share2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import RichTextEditor from '@/components/mom/RichTextEditor';
import ParticipantSelector from '@/components/mom/ParticipantSelector';
import FileAttachment from '@/components/mom/FileAttachment';
import ApprovalProgressBar from '@/components/mom/ApprovalProgressBar';

interface Attachment {
  id?: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  isUploading?: boolean;
}

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
  is_sent: boolean;
  sent_at: string | null;
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
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [moms, setMoms] = useState<MOM[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string>('cards');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [sendConfirmOpen, setSendConfirmOpen] = useState(false);
  const [momToSend, setMomToSend] = useState<MOM | null>(null);
  const [selectedMom, setSelectedMom] = useState<MOM | null>(null);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [editorContent, setEditorContent] = useState('');
  const [newMom, setNewMom] = useState({
    title: '',
    project_id: '',
  });
  const [creating, setCreating] = useState(false);
  const [sending, setSending] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const pdfContentRef = useRef<HTMLDivElement>(null);

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
        supabase.from('profiles_public').select('id, full_name, email, avatar_url').order('full_name'),
      ]);

      if (profilesRes.data) setAllProfiles(profilesRes.data);

      if (momsRes.data) {
        const momIds = momsRes.data.map(m => m.id);
        const { data: participantsData } = await supabase
          .from('mom_participants')
          .select('*')
          .in('mom_id', momIds);

        const creatorIds = momsRes.data.filter(m => m.created_by).map(m => m.created_by as string);
        const participantUserIds = participantsData?.map(p => p.user_id) || [];
        const allUserIds = [...new Set([...creatorIds, ...participantUserIds])];
        
        let profilesMap = new Map<string, { full_name: string | null; email: string; avatar_url: string | null }>();
        
        if (allUserIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles_public')
            .select('id, full_name, email, avatar_url')
            .in('id', allUserIds);
          
          if (profilesData) {
            profilesMap = new Map(profilesData.map(p => [p.id, { full_name: p.full_name, email: p.email, avatar_url: p.avatar_url }]));
          }
        }
        
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
          is_sent: m.is_sent ?? false,
          sent_at: m.sent_at ?? null,
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

  const handleCreateAndSendMom = async (sendImmediately: boolean = true) => {
    if (!newMom.title.trim() || !newMom.project_id) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in title and select a project',
        variant: 'destructive',
      });
      return;
    }

    if (sendImmediately && selectedParticipants.length === 0) {
      toast({
        title: 'No participants',
        description: 'Please add at least one participant to send the MOM',
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
          content: { html: editorContent },
          created_by: user?.id,
          is_sent: sendImmediately,
          sent_at: sendImmediately ? new Date().toISOString() : null,
        })
        .select('*, projects(name, color)')
        .single();

      if (error) throw error;

      if (data && selectedParticipants.length > 0) {
        const participantsToInsert = selectedParticipants.map(userId => ({
          mom_id: data.id,
          user_id: userId,
        }));

        await supabase.from('mom_participants').insert(participantsToInsert);
      }

      // Save attachments to database
      if (data && attachments.length > 0) {
        const attachmentsToInsert = attachments
          .filter(a => a.file_url && !a.isUploading)
          .map(a => ({
            mom_id: data.id,
            file_name: a.file_name,
            file_type: a.file_type,
            file_size: a.file_size,
            file_url: a.file_url,
            uploaded_by: user?.id,
          }));

        if (attachmentsToInsert.length > 0) {
          await supabase.from('mom_attachments').insert(attachmentsToInsert);
        }
      }

      if (data) {
        const { data: profile } = await supabase
          .from('profiles_public')
          .select('full_name, email, avatar_url')
          .eq('id', user?.id)
          .maybeSingle();

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
          is_sent: sendImmediately,
          sent_at: sendImmediately ? new Date().toISOString() : null,
          projects: data.projects as { name: string; color: string } | undefined,
          profiles: profile || undefined,
          participants: participantProfiles
        }, ...moms]);
      }

      setNewMom({ title: '', project_id: '' });
      setEditorContent('');
      setSelectedParticipants([]);
      setAttachments([]);
      setCreateDialogOpen(false);
      toast({
        title: sendImmediately ? 'MOM sent!' : 'MOM saved as draft',
        description: sendImmediately 
          ? 'All participants have been notified and can now view this MOM.'
          : 'Meeting minutes saved. You can send it later.',
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

  const handleSendMom = async () => {
    if (!momToSend) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('moms')
        .update({ 
          is_sent: true, 
          sent_at: new Date().toISOString() 
        })
        .eq('id', momToSend.id);

      if (error) throw error;

      setMoms(moms.map(m => 
        m.id === momToSend.id 
          ? { ...m, is_sent: true, sent_at: new Date().toISOString() }
          : m
      ));

      toast({
        title: 'MOM sent!',
        description: 'All participants have been notified and can now view this MOM.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send MOM',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
      setSendConfirmOpen(false);
      setMomToSend(null);
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

  const handleExportPdf = async () => {
    if (!selectedMom || !pdfContentRef.current) return;

    setExporting(true);
    try {
      const element = pdfContentRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 10;

      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`${selectedMom.title.replace(/[^a-z0-9]/gi, '_')}_MOM.pdf`);

      toast({
        title: 'PDF exported',
        description: 'Meeting minutes have been downloaded as PDF.',
      });
    } catch (error: any) {
      toast({
        title: 'Export failed',
        description: error.message || 'Failed to export PDF',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  const handleShareToWhatsApp = (mom: MOM) => {
    const projectName = mom.projects?.name || 'Project';
    const createdDate = format(new Date(mom.created_at), 'MMMM d, yyyy');
    
    // Extract text content from HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = mom.content?.html || mom.content?.text || '';
    const textContent = tempDiv.textContent || tempDiv.innerText || 'No content';
    
    // Build WhatsApp message
    const message = `📋 *Meeting Minutes*

*${mom.title}*
📁 Project: ${projectName}
📅 Date: ${createdDate}
${mom.sent_at ? `✉️ Sent: ${format(new Date(mom.sent_at), 'MMM d, h:mm a')}` : ''}

---
${textContent.substring(0, 1000)}${textContent.length > 1000 ? '...' : ''}

---
_Shared from Converza_`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
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

  const canViewMom = (mom: MOM) => {
    // Creator can always view
    if (mom.created_by === user?.id) return true;
    // If sent, participants can view
    if (mom.is_sent && isUserParticipant(mom)) return true;
    return false;
  };

  const getMomApprovalStatus = (mom: MOM) => {
    if (!mom.is_sent) return 'draft';
    if (!mom.participants || mom.participants.length === 0) return 'sent';
    const allAgreed = mom.participants.every(p => p.has_agreed);
    if (allAgreed) return 'approved';
    return 'pending';
  };

  const getPendingParticipants = (mom: MOM) => {
    return mom.participants?.filter(p => !p.has_agreed) || [];
  };

  const filteredMoms = moms.filter(m => {
    const matchesSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProject = selectedProject === 'all' || m.project_id === selectedProject;
    const canView = canViewMom(m);
    
    // Status filter
    let matchesStatus = true;
    if (statusFilter !== 'all') {
      const status = getMomApprovalStatus(m);
      matchesStatus = status === statusFilter;
    }
    
    return matchesSearch && matchesProject && canView && matchesStatus;
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
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New MOM
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Create Meeting Minutes
              </DialogTitle>
              <DialogDescription>
                Document your meeting discussions, decisions, and action items.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-4">
              {/* Left column - Main content */}
              <div className="lg:col-span-2 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="mom-title">Title *</Label>
                  <Input
                    id="mom-title"
                    placeholder="e.g., Sprint Planning - Week 12"
                    value={newMom.title}
                    onChange={(e) => setNewMom({ ...newMom, title: e.target.value })}
                    className="text-lg"
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
                              className="h-3 w-3 rounded-full"
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
                  <Label>Content</Label>
                  <RichTextEditor
                    content={editorContent}
                    onChange={setEditorContent}
                    placeholder="Start writing your meeting notes...

• Discussion points
• Decisions made  
• Action items
• Next steps"
                  />
                </div>
                {/* File Attachments */}
                <FileAttachment
                  attachments={attachments}
                  onAttachmentsChange={setAttachments}
                  userId={user?.id}
                />
              </div>

              {/* Right column - Participants */}
              <div className="lg:col-span-1">
                <ParticipantSelector
                  profiles={allProfiles}
                  selectedIds={selectedParticipants}
                  onToggle={toggleParticipant}
                  currentUserId={user?.id}
                />
              </div>
            </div>
            <DialogFooter className="gap-2 flex-wrap">
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => handleCreateAndSendMom(false)} 
                disabled={creating}
                className="gap-2"
              >
                <FileText className="h-4 w-4" />
                Save as Draft
              </Button>
              <Button 
                onClick={() => handleCreateAndSendMom(true)} 
                disabled={creating || selectedParticipants.length === 0} 
                className="gap-2"
              >
                {creating ? 'Sending...' : (
                  <>
                    <Send className="h-4 w-4" />
                    Send to Participants
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
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
          <SelectTrigger className="w-[180px]">
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
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3" />
                Draft
              </div>
            </SelectItem>
            <SelectItem value="pending">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-3 w-3 text-amber-500" />
                Pending Approval
              </div>
            </SelectItem>
            <SelectItem value="approved">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                Approved
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs for view toggle */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="cards" className="gap-2">
            <FileText className="h-4 w-4" />
            Cards
          </TabsTrigger>
          <TabsTrigger value="table" className="gap-2">
            <Table2 className="h-4 w-4" />
            Status Table
          </TabsTrigger>
        </TabsList>

        {/* Card View */}
        <TabsContent value="cards" className="space-y-4">
          {filteredMoms.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No meeting minutes found</h3>
                <p className="text-muted-foreground text-center max-w-sm">
                  {searchQuery || selectedProject !== 'all' || statusFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Create your first MOM to document meeting discussions'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              <AnimatePresence>
                {filteredMoms.map((mom, index) => {
                  const stats = getAgreementStats(mom.participants);
                  const canAgree = mom.is_sent && isUserParticipant(mom) && !hasUserAgreed(mom);
                  const isCreator = mom.created_by === user?.id;
                  const approvalStatus = getMomApprovalStatus(mom);
                  
                  return (
                    <motion.div
                      key={mom.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="card-hover group overflow-hidden">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-4 flex-1 min-w-0">
                              <div
                                className="h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
                                style={{ backgroundColor: mom.projects?.color || '#3b82f6' }}
                              >
                                <FileText className="h-6 w-6 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="font-semibold text-foreground truncate">{mom.title}</h3>
                                  {/* Status Badge */}
                                  {approvalStatus === 'approved' ? (
                                    <Badge className="gap-1 text-xs bg-green-600 hover:bg-green-600">
                                      <CheckCircle2 className="h-3 w-3" />
                                      Approved
                                    </Badge>
                                  ) : approvalStatus === 'pending' ? (
                                    <Badge variant="outline" className="gap-1 text-xs border-amber-500 text-amber-600">
                                      <AlertCircle className="h-3 w-3" />
                                      Pending
                                    </Badge>
                                  ) : mom.is_sent ? (
                                    <Badge variant="default" className="gap-1 text-xs">
                                      <CheckCircle2 className="h-3 w-3" />
                                      Sent
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary" className="gap-1 text-xs">
                                      <Clock className="h-3 w-3" />
                                      Draft
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-3 mt-1.5 text-sm text-muted-foreground">
                                  {mom.projects && (
                                    <Badge variant="outline" className="font-normal">
                                      {mom.projects.name}
                                    </Badge>
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
                                
                                {/* Approval Progress Bar */}
                                {mom.participants && mom.participants.length > 0 && (
                                  <div className="mt-3 space-y-2">
                                    <ApprovalProgressBar
                                      participants={mom.participants}
                                      isSent={mom.is_sent}
                                    />
                                    {canAgree && (
                                      <Button 
                                        size="sm" 
                                        variant="outline" 
                                        className="h-7 text-xs gap-1 border-primary text-primary hover:bg-primary/10"
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
                              </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {/* Send button for drafts */}
                              {isCreator && !mom.is_sent && mom.participants && mom.participants.length > 0 && (
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="gap-1"
                                  onClick={() => {
                                    setMomToSend(mom);
                                    setSendConfirmOpen(true);
                                  }}
                                >
                                  <Send className="h-4 w-4" />
                                  Send
                                </Button>
                              )}
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleShareToWhatsApp(mom);
                                      }}
                                    >
                                      <Share2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Share to WhatsApp</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
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
                              {isCreator && (
                                <Button variant="ghost" size="icon">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              {(isCreator || isAdmin) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => handleDeleteMom(mom.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>

        {/* Table View - Status Overview */}
        <TabsContent value="table">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Table2 className="h-5 w-5" />
                MOM Status Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredMoms.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">No meeting minutes found</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>MOM Title</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Approval</TableHead>
                        <TableHead>Pending From</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMoms.map((mom) => {
                        const stats = getAgreementStats(mom.participants);
                        const approvalStatus = getMomApprovalStatus(mom);
                        const pendingParticipants = getPendingParticipants(mom);
                        const isCreator = mom.created_by === user?.id;
                        
                        return (
                          <TableRow key={mom.id}>
                            <TableCell className="font-medium max-w-[200px] truncate">
                              {mom.title}
                            </TableCell>
                            <TableCell>
                              {mom.projects && (
                                <Badge variant="outline" className="gap-1">
                                  <div
                                    className="h-2 w-2 rounded-full"
                                    style={{ backgroundColor: mom.projects.color }}
                                  />
                                  {mom.projects.name}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {format(new Date(mom.created_at), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell>
                              {approvalStatus === 'approved' ? (
                                <Badge className="bg-green-600 hover:bg-green-600 gap-1">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Approved
                                </Badge>
                              ) : approvalStatus === 'pending' ? (
                                <Badge variant="outline" className="border-amber-500 text-amber-600 gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  Pending
                                </Badge>
                              ) : mom.is_sent ? (
                                <Badge variant="default" className="gap-1">
                                  <Send className="h-3 w-3" />
                                  Sent
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="gap-1">
                                  <Clock className="h-3 w-3" />
                                  Draft
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {mom.participants && mom.participants.length > 0 ? (
                                <div className="flex items-center gap-1">
                                  <span className={`font-medium ${stats.agreed === stats.total ? 'text-green-600' : 'text-amber-600'}`}>
                                    {stats.agreed}/{stats.total}
                                  </span>
                                  <span className="text-muted-foreground text-sm">agreed</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">No participants</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {pendingParticipants.length > 0 ? (
                                <TooltipProvider>
                                  <div className="flex -space-x-1">
                                    {pendingParticipants.slice(0, 3).map((p) => (
                                      <Tooltip key={p.user_id}>
                                        <TooltipTrigger asChild>
                                          <Avatar className="h-6 w-6 border border-background">
                                            <AvatarImage src={p.profiles?.avatar_url || undefined} />
                                            <AvatarFallback className="text-[10px]">
                                              {getInitials(p.profiles?.full_name || null, p.profiles?.email || '')}
                                            </AvatarFallback>
                                          </Avatar>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          {p.profiles?.full_name || p.profiles?.email?.split('@')[0]}
                                        </TooltipContent>
                                      </Tooltip>
                                    ))}
                                    {pendingParticipants.length > 3 && (
                                      <Avatar className="h-6 w-6 border border-background">
                                        <AvatarFallback className="text-[10px] bg-muted">
                                          +{pendingParticipants.length - 3}
                                        </AvatarFallback>
                                      </Avatar>
                                    )}
                                  </div>
                                </TooltipProvider>
                              ) : mom.is_sent && mom.participants && mom.participants.length > 0 ? (
                                <span className="text-green-600 text-sm flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3" />
                                  All approved
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-sm">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {isCreator && !mom.is_sent && mom.participants && mom.participants.length > 0 && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 gap-1"
                                    onClick={() => {
                                      setMomToSend(mom);
                                      setSendConfirmOpen(true);
                                    }}
                                  >
                                    <Send className="h-3 w-3" />
                                    Send
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => {
                                    setSelectedMom(mom);
                                    setViewDialogOpen(true);
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {(isCreator || isAdmin) && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                    onClick={() => handleDeleteMom(mom.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* View dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {selectedMom && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center shadow-sm"
                    style={{ backgroundColor: selectedMom.projects?.color || '#3b82f6' }}
                  >
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <DialogTitle>{selectedMom.title}</DialogTitle>
                      {selectedMom.is_sent ? (
                        <Badge variant="default" className="gap-1 text-xs">
                          <CheckCircle2 className="h-3 w-3" />
                          Sent
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <Clock className="h-3 w-3" />
                          Draft
                        </Badge>
                      )}
                    </div>
                    <DialogDescription>
                      {selectedMom.projects?.name} • {format(new Date(selectedMom.created_at), 'MMMM d, yyyy')}
                      {selectedMom.sent_at && ` • Sent ${format(new Date(selectedMom.sent_at), 'MMM d, h:mm a')}`}
                    </DialogDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => handleShareToWhatsApp(selectedMom)}
                    >
                      <Share2 className="h-4 w-4" />
                      WhatsApp
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={handleExportPdf}
                      disabled={exporting}
                    >
                      <Download className="h-4 w-4" />
                      {exporting ? 'Exporting...' : 'Export PDF'}
                    </Button>
                  </div>
                </div>
              </DialogHeader>
              
              {/* PDF Export Content */}
              <div ref={pdfContentRef} className="bg-background p-4">
                {/* Header for PDF */}
                <div className="mb-4 pb-4 border-b">
                  <h1 className="text-xl font-bold">{selectedMom.title}</h1>
                  <p className="text-sm text-muted-foreground">
                    {selectedMom.projects?.name} • {format(new Date(selectedMom.created_at), 'MMMM d, yyyy')}
                    {selectedMom.sent_at && ` • Sent ${format(new Date(selectedMom.sent_at), 'MMM d, h:mm a')}`}
                  </p>
                </div>

                {/* Approval Status Progress Bar */}
                {selectedMom.participants && selectedMom.participants.length > 0 && (
                  <div className="border rounded-xl p-4 space-y-4 bg-muted/30 mb-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      <h4 className="font-medium">Approval Status</h4>
                    </div>
                    <ApprovalProgressBar
                      participants={selectedMom.participants}
                      isSent={selectedMom.is_sent}
                    />
                    
                    {/* Detailed participant list */}
                    <div className="grid gap-2 pt-2 border-t">
                      {selectedMom.participants.map((participant) => (
                        <div 
                          key={participant.user_id}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-background border"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className={`h-9 w-9 ring-2 ${participant.has_agreed ? 'ring-primary' : 'ring-transparent'}`}>
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
                            <Badge variant="default" className="gap-1">
                              <Check className="h-3 w-3" />
                              Approved
                              {participant.agreed_at && (
                                <span className="text-xs opacity-75 ml-1">
                                  {format(new Date(participant.agreed_at), 'MMM d')}
                                </span>
                              )}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              <Clock className="h-3 w-3 mr-1" />
                              Pending
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Content */}
                <div>
                  <Label className="text-sm text-muted-foreground mb-2 block">Content</Label>
                  <div 
                    className="prose prose-sm max-w-none bg-muted/30 p-4 rounded-xl border"
                    dangerouslySetInnerHTML={{ __html: selectedMom.content?.html || selectedMom.content?.text || '<p>No content</p>' }}
                  />
                </div>
              </div>
              
              {/* Agree Button for Current User - Outside PDF area */}
              {selectedMom.is_sent && isUserParticipant(selectedMom) && !hasUserAgreed(selectedMom) && (
                <Button 
                  className="w-full gap-2" 
                  onClick={() => handleAgree(selectedMom.id)}
                >
                  <Check className="h-4 w-4" />
                  I Agree to this MOM
                </Button>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Send Confirmation Dialog */}
      <AlertDialog open={sendConfirmOpen} onOpenChange={setSendConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Send MOM to Participants?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will notify all {momToSend?.participants?.length || 0} participant(s) and make this MOM visible to them. 
              They will be able to view and acknowledge the meeting minutes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {momToSend?.participants && momToSend.participants.length > 0 && (
            <div className="flex flex-wrap gap-2 py-2">
              {momToSend.participants.map((p) => (
                <Badge key={p.user_id} variant="secondary" className="gap-1">
                  <Avatar className="h-4 w-4">
                    <AvatarImage src={p.profiles?.avatar_url || undefined} />
                    <AvatarFallback className="text-[8px]">
                      {getInitials(p.profiles?.full_name || null, p.profiles?.email || '')}
                    </AvatarFallback>
                  </Avatar>
                  {p.profiles?.full_name || p.profiles?.email?.split('@')[0]}
                </Badge>
              ))}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSendMom} disabled={sending} className="gap-2">
              {sending ? 'Sending...' : (
                <>
                  <Send className="h-4 w-4" />
                  Send MOM
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
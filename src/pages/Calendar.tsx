import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Video,
  Repeat,
  Users,
  Building2,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import RecurrenceOptions from '@/components/calendar/RecurrenceOptions';
import CalendarSyncMenu from '@/components/calendar/CalendarSyncMenu';

interface MeetingParticipant {
  id: string;
  user_id: string;
  is_attending: boolean;
  profiles?: {
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

interface Meeting {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  location: string | null;
  meeting_link: string | null;
  meeting_type: 'online' | 'offline';
  project_id: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  is_recurring: boolean;
  recurrence_pattern: string | null;
  recurrence_interval: number | null;
  recurrence_end_date: string | null;
  recurrence_days: string[] | null;
  projects?: { name: string; color: string };
  participants?: MeetingParticipant[];
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

export default function CalendarPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [newMeeting, setNewMeeting] = useState({
    title: '',
    description: '',
    project_id: '',
    date: '',
    start_time: '',
    end_time: '',
    location: '',
    meeting_link: '',
    meeting_type: 'online' as 'online' | 'offline',
    is_recurring: false,
    recurrence_pattern: 'weekly',
    recurrence_interval: 1,
    recurrence_end_date: '',
    recurrence_days: [] as string[],
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchData();
  }, [user, currentDate]);

  const fetchData = async () => {
    if (!user) return;

    try {
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);

      const [meetingsRes, projectsRes, profilesRes] = await Promise.all([
        supabase
          .from('meetings')
          .select('*, projects(name, color)')
          .gte('start_time', start.toISOString())
          .lte('start_time', end.toISOString())
          .order('start_time'),
        supabase.from('projects').select('id, name, color').order('name'),
        supabase.from('profiles').select('id, full_name, email, avatar_url').order('full_name'),
      ]);

      if (profilesRes.data) setAllProfiles(profilesRes.data);

      if (meetingsRes.data) {
        // Fetch participants for all meetings
        const meetingIds = meetingsRes.data.map(m => m.id);
        const { data: participantsData } = await supabase
          .from('meeting_participants')
          .select('*')
          .in('meeting_id', meetingIds);

        const participantUserIds = participantsData?.map(p => p.user_id) || [];
        let profilesMap = new Map<string, { full_name: string | null; email: string; avatar_url: string | null }>();
        
        if (participantUserIds.length > 0 && profilesRes.data) {
          profilesMap = new Map(profilesRes.data.map(p => [p.id, { full_name: p.full_name, email: p.email, avatar_url: p.avatar_url }]));
        }

        const participantsByMeeting = new Map<string, MeetingParticipant[]>();
        participantsData?.forEach(p => {
          const existing = participantsByMeeting.get(p.meeting_id) || [];
          existing.push({
            ...p,
            is_attending: p.is_attending ?? true,
            profiles: profilesMap.get(p.user_id)
          });
          participantsByMeeting.set(p.meeting_id, existing);
        });

        setMeetings(meetingsRes.data.map(m => ({
          ...m,
          status: m.status as 'scheduled' | 'completed' | 'cancelled',
          meeting_type: (m.meeting_type as 'online' | 'offline') || 'online',
          is_recurring: m.is_recurring ?? false,
          recurrence_pattern: m.recurrence_pattern ?? null,
          recurrence_interval: m.recurrence_interval ?? null,
          recurrence_end_date: m.recurrence_end_date ?? null,
          recurrence_days: m.recurrence_days ?? null,
          projects: m.projects as { name: string; color: string } | undefined,
          participants: participantsByMeeting.get(m.id) || []
        })));
      }
      if (projectsRes.data) setProjects(projectsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMeeting = async () => {
    if (!newMeeting.title.trim() || !newMeeting.project_id || !newMeeting.date || !newMeeting.start_time || !newMeeting.end_time) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setCreating(true);
    try {
      const startDateTime = new Date(`${newMeeting.date}T${newMeeting.start_time}`);
      const endDateTime = new Date(`${newMeeting.date}T${newMeeting.end_time}`);

      const { data, error } = await supabase
        .from('meetings')
        .insert({
          title: newMeeting.title.trim(),
          description: newMeeting.description.trim() || null,
          project_id: newMeeting.project_id,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          location: newMeeting.meeting_type === 'offline' ? newMeeting.location.trim() || null : null,
          meeting_link: newMeeting.meeting_type === 'online' ? newMeeting.meeting_link.trim() || null : null,
          meeting_type: newMeeting.meeting_type,
          created_by: user?.id,
          is_recurring: newMeeting.is_recurring,
          recurrence_pattern: newMeeting.is_recurring ? newMeeting.recurrence_pattern : null,
          recurrence_interval: newMeeting.is_recurring ? newMeeting.recurrence_interval : null,
          recurrence_end_date: newMeeting.is_recurring && newMeeting.recurrence_end_date ? newMeeting.recurrence_end_date : null,
          recurrence_days: newMeeting.is_recurring && newMeeting.recurrence_pattern === 'weekly' ? newMeeting.recurrence_days : null,
        })
        .select('*, projects(name, color)')
        .single();

      if (error) throw error;

      // Add participants to the meeting (this will trigger notifications via DB trigger)
      if (data && selectedParticipants.length > 0) {
        const participantsToInsert = selectedParticipants.map(userId => ({
          meeting_id: data.id,
          user_id: userId,
          is_attending: true,
        }));

        await supabase.from('meeting_participants').insert(participantsToInsert);
      }

      if (data) {
        const participantProfiles = selectedParticipants.map(userId => {
          const p = allProfiles.find(prof => prof.id === userId);
          return {
            id: '',
            user_id: userId,
            is_attending: true,
            profiles: p ? { full_name: p.full_name, email: p.email, avatar_url: p.avatar_url } : undefined
          };
        });

        setMeetings([...meetings, {
          ...data,
          status: data.status as 'scheduled' | 'completed' | 'cancelled',
          meeting_type: (data.meeting_type as 'online' | 'offline') || 'online',
          projects: data.projects as { name: string; color: string } | undefined,
          participants: participantProfiles
        }]);
      }
      setNewMeeting({
        title: '',
        description: '',
        project_id: '',
        date: '',
        start_time: '',
        end_time: '',
        location: '',
        meeting_link: '',
        meeting_type: 'online',
        is_recurring: false,
        recurrence_pattern: 'weekly',
        recurrence_interval: 1,
        recurrence_end_date: '',
        recurrence_days: [],
      });
      setSelectedParticipants([]);
      setCreateDialogOpen(false);
      toast({
        title: 'Meeting scheduled',
        description: selectedParticipants.length > 0 
          ? `Your meeting has been added and ${selectedParticipants.length} participant(s) have been notified`
          : 'Your meeting has been added to the calendar',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create meeting',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getMeetingsForDay = (date: Date) => {
    return meetings.filter(m => isSameDay(new Date(m.start_time), date));
  };

  const selectedDateMeetings = selectedDate ? getMeetingsForDay(selectedDate) : [];

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
          <h1 className="text-2xl font-bold">Calendar</h1>
          <p className="text-muted-foreground">Manage your meetings and schedule</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Schedule Meeting
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Schedule New Meeting</DialogTitle>
              <DialogDescription>
                Add a new meeting to your project calendar.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="meeting-title">Title *</Label>
                <Input
                  id="meeting-title"
                  placeholder="Meeting title"
                  value={newMeeting.title}
                  onChange={(e) => setNewMeeting({ ...newMeeting, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="meeting-project">Project *</Label>
                <Select
                  value={newMeeting.project_id}
                  onValueChange={(value) => setNewMeeting({ ...newMeeting, project_id: value })}
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
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="meeting-date">Date *</Label>
                  <Input
                    id="meeting-date"
                    type="date"
                    value={newMeeting.date}
                    onChange={(e) => setNewMeeting({ ...newMeeting, date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meeting-start">Start *</Label>
                  <Input
                    id="meeting-start"
                    type="time"
                    value={newMeeting.start_time}
                    onChange={(e) => setNewMeeting({ ...newMeeting, start_time: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meeting-end">End *</Label>
                  <Input
                    id="meeting-end"
                    type="time"
                    value={newMeeting.end_time}
                    onChange={(e) => setNewMeeting({ ...newMeeting, end_time: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="meeting-description">Description</Label>
                <Textarea
                  id="meeting-description"
                  placeholder="Meeting agenda or notes"
                  value={newMeeting.description}
                  onChange={(e) => setNewMeeting({ ...newMeeting, description: e.target.value })}
                  rows={2}
                />
              </div>

              {/* Meeting Type */}
              <div className="space-y-3">
                <Label>Meeting Type *</Label>
                <RadioGroup
                  value={newMeeting.meeting_type}
                  onValueChange={(value: 'online' | 'offline') => setNewMeeting({ ...newMeeting, meeting_type: value })}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="online" id="online" />
                    <Label htmlFor="online" className="flex items-center gap-2 cursor-pointer">
                      <Video className="h-4 w-4 text-primary" />
                      Online
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="offline" id="offline" />
                    <Label htmlFor="offline" className="flex items-center gap-2 cursor-pointer">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      Offline
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Conditional fields based on meeting type */}
              {newMeeting.meeting_type === 'online' ? (
                <div className="space-y-2">
                  <Label htmlFor="meeting-link">Meeting Link</Label>
                  <Input
                    id="meeting-link"
                    placeholder="Video call URL (e.g., https://meet.google.com/...)"
                    value={newMeeting.meeting_link}
                    onChange={(e) => setNewMeeting({ ...newMeeting, meeting_link: e.target.value })}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="meeting-location">Location *</Label>
                  <Input
                    id="meeting-location"
                    placeholder="Room name or address"
                    value={newMeeting.location}
                    onChange={(e) => setNewMeeting({ ...newMeeting, location: e.target.value })}
                  />
                </div>
              )}

              {/* Invite Participants */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Invite Participants
                </Label>
                <div className="border rounded-lg p-3 max-h-[200px] overflow-y-auto space-y-2">
                  {allProfiles.filter(p => p.id !== user?.id).map((profile) => {
                    const isSelected = selectedParticipants.includes(profile.id);
                    return (
                      <div 
                        key={profile.id}
                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted'}`}
                        onClick={() => {
                          setSelectedParticipants(prev => 
                            prev.includes(profile.id) 
                              ? prev.filter(id => id !== profile.id)
                              : [...prev, profile.id]
                          );
                        }}
                      >
                        <Checkbox checked={isSelected} />
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={profile.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {profile.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || profile.email.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {profile.full_name || profile.email.split('@')[0]}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
                        </div>
                      </div>
                    );
                  })}
                  {allProfiles.filter(p => p.id !== user?.id).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No other users available</p>
                  )}
                </div>
                {selectedParticipants.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {selectedParticipants.length} participant(s) will be notified
                  </p>
                )}
              </div>
              
              <RecurrenceOptions
                isRecurring={newMeeting.is_recurring}
                onIsRecurringChange={(value) => setNewMeeting({ ...newMeeting, is_recurring: value })}
                recurrencePattern={newMeeting.recurrence_pattern}
                onRecurrencePatternChange={(value) => setNewMeeting({ ...newMeeting, recurrence_pattern: value })}
                recurrenceInterval={newMeeting.recurrence_interval}
                onRecurrenceIntervalChange={(value) => setNewMeeting({ ...newMeeting, recurrence_interval: value })}
                recurrenceEndDate={newMeeting.recurrence_end_date}
                onRecurrenceEndDateChange={(value) => setNewMeeting({ ...newMeeting, recurrence_end_date: value })}
                recurrenceDays={newMeeting.recurrence_days}
                onRecurrenceDaysChange={(value) => setNewMeeting({ ...newMeeting, recurrence_days: value })}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateMeeting} disabled={creating}>
                {creating ? 'Scheduling...' : 'Schedule Meeting'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">
              {format(currentDate, 'MMMM yyyy')}
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentDate(new Date())}
              >
                Today
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}
            </div>
            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day) => {
                const dayMeetings = getMeetingsForDay(day);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isCurrentMonth = isSameMonth(day, currentDate);

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={`
                      min-h-[80px] p-1 rounded-lg text-sm transition-colors
                      ${isCurrentMonth ? 'text-foreground' : 'text-muted-foreground/50'}
                      ${isToday(day) ? 'bg-primary/10' : ''}
                      ${isSelected ? 'ring-2 ring-primary' : 'hover:bg-muted'}
                    `}
                  >
                    <div className={`
                      h-7 w-7 flex items-center justify-center rounded-full mb-1 mx-auto
                      ${isToday(day) ? 'bg-primary text-primary-foreground' : ''}
                    `}>
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-0.5">
                      {dayMeetings.slice(0, 2).map((meeting) => (
                        <div
                          key={meeting.id}
                          className="h-1.5 rounded-full mx-0.5"
                          style={{ backgroundColor: meeting.projects?.color || '#3b82f6' }}
                        />
                      ))}
                      {dayMeetings.length > 2 && (
                        <p className="text-[10px] text-muted-foreground text-center">
                          +{dayMeetings.length - 2}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Selected day details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {selectedDate ? format(selectedDate, 'EEEE, MMMM d') : 'Select a date'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedDate ? (
              <p className="text-muted-foreground text-sm">
                Click on a date to see meetings
              </p>
            ) : selectedDateMeetings.length === 0 ? (
              <div className="text-center py-8">
                <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No meetings scheduled</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDateMeetings.map((meeting) => (
                  <div
                    key={meeting.id}
                    className="p-3 rounded-lg border border-border hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="h-2 w-2 rounded-full mt-2 flex-shrink-0"
                        style={{ backgroundColor: meeting.projects?.color || '#3b82f6' }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm">{meeting.title}</p>
                          {meeting.is_recurring && (
                            <Repeat className="h-3 w-3 text-muted-foreground" />
                          )}
                          <Badge variant={meeting.meeting_type === 'online' ? 'default' : 'secondary'} className="text-[10px] h-5">
                            {meeting.meeting_type === 'online' ? (
                              <><Video className="h-2.5 w-2.5 mr-1" />Online</>
                            ) : (
                              <><Building2 className="h-2.5 w-2.5 mr-1" />Offline</>
                            )}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>
                            {format(new Date(meeting.start_time), 'h:mm a')} -{' '}
                            {format(new Date(meeting.end_time), 'h:mm a')}
                          </span>
                        </div>
                        {meeting.location && meeting.meeting_type === 'offline' && (
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span>{meeting.location}</span>
                          </div>
                        )}
                        {meeting.meeting_link && meeting.meeting_type === 'online' && (
                          <div className="flex items-center gap-2 mt-1">
                            <Video className="h-3 w-3 text-primary" />
                            <a
                              href={meeting.meeting_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline"
                            >
                              Join meeting
                            </a>
                          </div>
                        )}
                        
                        {/* Participants */}
                        {meeting.participants && meeting.participants.length > 0 && (
                          <TooltipProvider>
                            <div className="flex items-center gap-2 mt-2">
                              <Users className="h-3 w-3 text-muted-foreground" />
                              <div className="flex -space-x-1.5">
                                {meeting.participants.slice(0, 4).map((participant) => (
                                  <Tooltip key={participant.user_id}>
                                    <TooltipTrigger asChild>
                                      <Avatar className="h-5 w-5 border border-background">
                                        <AvatarImage src={participant.profiles?.avatar_url || undefined} />
                                        <AvatarFallback className="text-[8px]">
                                          {participant.profiles?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 
                                           participant.profiles?.email?.slice(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {participant.profiles?.full_name || participant.profiles?.email?.split('@')[0]}
                                    </TooltipContent>
                                  </Tooltip>
                                ))}
                                {meeting.participants.length > 4 && (
                                  <Avatar className="h-5 w-5 border border-background">
                                    <AvatarFallback className="text-[8px] bg-muted">
                                      +{meeting.participants.length - 4}
                                    </AvatarFallback>
                                  </Avatar>
                                )}
                              </div>
                            </div>
                          </TooltipProvider>
                        )}

                        <div className="flex items-center gap-2 mt-2">
                          {meeting.projects && (
                            <Badge variant="outline" className="text-xs">
                              {meeting.projects.name}
                            </Badge>
                          )}
                          <CalendarSyncMenu meeting={meeting} size="icon" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}

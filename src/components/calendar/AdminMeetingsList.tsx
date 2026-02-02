import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Video,
  Building2,
  Users,
  Repeat,
  ChevronDown,
  History,
  CalendarCheck,
  User,
  ExternalLink,
  Check,
  X,
  Clock3,
} from 'lucide-react';
import { format, isPast, isFuture, isToday, formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface MeetingParticipant {
  id: string;
  user_id: string;
  is_attending: boolean | null;
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
  created_by: string | null;
  projects?: { name: string; color: string };
  participants?: MeetingParticipant[];
}

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
}

interface AdminMeetingsListProps {
  meetings: Meeting[];
  allProfiles: Profile[];
  selectedUserFilter: string;
  onUserFilterChange: (userId: string) => void;
}

export default function AdminMeetingsList({
  meetings,
  allProfiles,
  selectedUserFilter,
  onUserFilterChange,
}: AdminMeetingsListProps) {
  const [expandedMeeting, setExpandedMeeting] = useState<string | null>(null);

  const getFilteredMeetings = () => {
    if (selectedUserFilter === 'all') return meetings;
    return meetings.filter(m => 
      m.created_by === selectedUserFilter || 
      m.participants?.some(p => p.user_id === selectedUserFilter)
    );
  };

  const filteredMeetings = getFilteredMeetings();
  const upcomingMeetings = filteredMeetings.filter(m => isFuture(new Date(m.start_time)) || isToday(new Date(m.start_time)));
  const pastMeetings = filteredMeetings.filter(m => isPast(new Date(m.end_time)) && !isToday(new Date(m.start_time)));

  const getCreatorProfile = (createdBy: string | null) => {
    if (!createdBy) return null;
    return allProfiles.find(p => p.id === createdBy);
  };

  const MeetingCard = ({ meeting, index }: { meeting: Meeting; index: number }) => {
    const isExpanded = expandedMeeting === meeting.id;
    const creator = getCreatorProfile(meeting.created_by);
    const isPastMeeting = isPast(new Date(meeting.end_time));
    const acceptedCount = meeting.participants?.filter(p => p.is_attending === true).length || 0;
    const declinedCount = meeting.participants?.filter(p => p.is_attending === false).length || 0;
    const pendingCount = meeting.participants?.filter(p => p.is_attending === null).length || 0;
    const totalParticipants = meeting.participants?.length || 0;

    const timeUntil = !isPastMeeting 
      ? formatDistanceToNow(new Date(meeting.start_time), { addSuffix: true })
      : formatDistanceToNow(new Date(meeting.end_time), { addSuffix: true });

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ delay: index * 0.05, type: 'spring', stiffness: 300, damping: 30 }}
        layout
      >
        <Collapsible open={isExpanded} onOpenChange={() => setExpandedMeeting(isExpanded ? null : meeting.id)}>
          <Card className={cn(
            'overflow-hidden transition-all duration-300 border-l-4',
            isPastMeeting ? 'opacity-70 hover:opacity-90' : 'hover:shadow-lg',
            isExpanded && 'ring-2 ring-primary/20 shadow-lg'
          )}
          style={{ borderLeftColor: meeting.projects?.color || 'hsl(var(--primary))' }}
          >
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-3 px-4">
                <div className="flex items-center justify-between gap-3">
                  {/* Left side - Meeting info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Time indicator */}
                    <div className={cn(
                      'flex flex-col items-center justify-center w-14 h-14 rounded-xl text-center flex-shrink-0',
                      isPastMeeting 
                        ? 'bg-muted text-muted-foreground' 
                        : isToday(new Date(meeting.start_time))
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-primary/10 text-primary'
                    )}>
                      <span className="text-[10px] font-medium uppercase">
                        {format(new Date(meeting.start_time), 'MMM')}
                      </span>
                      <span className="text-lg font-bold leading-none">
                        {format(new Date(meeting.start_time), 'd')}
                      </span>
                      <span className="text-[10px]">
                        {format(new Date(meeting.start_time), 'h:mm a')}
                      </span>
                    </div>

                    {/* Meeting details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h4 className="font-semibold text-sm truncate">{meeting.title}</h4>
                        {meeting.is_recurring && (
                          <motion.div whileHover={{ rotate: 180 }} transition={{ duration: 0.3 }}>
                            <Repeat className="h-3 w-3 text-muted-foreground" />
                          </motion.div>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <Badge 
                          variant={meeting.meeting_type === 'online' ? 'default' : 'secondary'} 
                          className="text-[10px] h-5 gap-1"
                        >
                          {meeting.meeting_type === 'online' ? (
                            <><Video className="h-2.5 w-2.5" />Online</>
                          ) : (
                            <><Building2 className="h-2.5 w-2.5" />Offline</>
                          )}
                        </Badge>
                        <span className="flex items-center gap-1">
                          <Clock3 className="h-3 w-3" />
                          {timeUntil}
                        </span>
                        {creator && (
                          <span className="flex items-center gap-1 hidden sm:flex">
                            <User className="h-3 w-3" />
                            {creator.full_name || creator.email.split('@')[0]}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right side - Stats & expand */}
                  <div className="flex items-center gap-3">
                    {/* Participant stats */}
                    {totalParticipants > 0 && (
                      <div className="hidden sm:flex items-center gap-1">
                        <motion.div 
                          className="flex items-center gap-0.5 px-2 py-1 rounded-full bg-emerald-500/10"
                          whileHover={{ scale: 1.05 }}
                        >
                          <Check className="h-3 w-3 text-emerald-600" />
                          <span className="text-xs font-medium text-emerald-600">{acceptedCount}</span>
                        </motion.div>
                        <motion.div 
                          className="flex items-center gap-0.5 px-2 py-1 rounded-full bg-amber-500/10"
                          whileHover={{ scale: 1.05 }}
                        >
                          <Clock className="h-3 w-3 text-amber-600" />
                          <span className="text-xs font-medium text-amber-600">{pendingCount}</span>
                        </motion.div>
                        <motion.div 
                          className="flex items-center gap-0.5 px-2 py-1 rounded-full bg-rose-500/10"
                          whileHover={{ scale: 1.05 }}
                        >
                          <X className="h-3 w-3 text-rose-600" />
                          <span className="text-xs font-medium text-rose-600">{declinedCount}</span>
                        </motion.div>
                      </div>
                    )}
                    
                    {/* Expand button */}
                    <motion.div
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="h-8 w-8 rounded-full bg-muted/50 flex items-center justify-center"
                    >
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </motion.div>
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <CardContent className="pt-0 pb-4 px-4 border-t bg-gradient-to-b from-muted/30 to-transparent">
                  <div className="grid gap-4 pt-4">
                    {/* Quick info row */}
                    <div className="flex flex-wrap items-center gap-3">
                      {meeting.projects && (
                        <Badge 
                          variant="outline" 
                          className="gap-1.5"
                          style={{ borderColor: meeting.projects.color, color: meeting.projects.color }}
                        >
                          <div 
                            className="h-2 w-2 rounded-full" 
                            style={{ backgroundColor: meeting.projects.color }}
                          />
                          {meeting.projects.name}
                        </Badge>
                      )}
                      {meeting.location && meeting.meeting_type === 'offline' && (
                        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          {meeting.location}
                        </span>
                      )}
                      {meeting.meeting_link && meeting.meeting_type === 'online' && (
                        <motion.a
                          href={meeting.meeting_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                          whileHover={{ x: 2 }}
                        >
                          <Video className="h-3.5 w-3.5" />
                          Join Meeting
                          <ExternalLink className="h-3 w-3" />
                        </motion.a>
                      )}
                    </div>

                    {/* Description */}
                    {meeting.description && (
                      <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                        {meeting.description}
                      </p>
                    )}

                    {/* Participants grid */}
                    {meeting.participants && meeting.participants.length > 0 && (
                      <div className="space-y-3">
                        <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                          <Users className="h-3.5 w-3.5" />
                          Participants ({meeting.participants.length})
                        </h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {meeting.participants.map((participant, pIndex) => (
                            <motion.div
                              key={participant.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: pIndex * 0.05 }}
                              className={cn(
                                'flex items-center gap-2 p-2 rounded-lg border transition-colors',
                                participant.is_attending === true && 'bg-emerald-500/5 border-emerald-200',
                                participant.is_attending === false && 'bg-rose-500/5 border-rose-200',
                                participant.is_attending === null && 'bg-amber-500/5 border-amber-200'
                              )}
                            >
                              <Avatar className={cn(
                                'h-8 w-8 ring-2',
                                participant.is_attending === true && 'ring-emerald-500',
                                participant.is_attending === false && 'ring-rose-500',
                                participant.is_attending === null && 'ring-amber-500'
                              )}>
                                <AvatarImage src={participant.profiles?.avatar_url || undefined} />
                                <AvatarFallback className="text-xs">
                                  {participant.profiles?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 
                                   participant.profiles?.email?.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {participant.profiles?.full_name || participant.profiles?.email?.split('@')[0]}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {participant.profiles?.email}
                                </p>
                              </div>
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  'text-[10px] gap-1',
                                  participant.is_attending === true && 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
                                  participant.is_attending === false && 'bg-rose-500/10 text-rose-600 border-rose-200',
                                  participant.is_attending === null && 'bg-amber-500/10 text-amber-600 border-amber-200'
                                )}
                              >
                                {participant.is_attending === true && <><Check className="h-2.5 w-2.5" />Accepted</>}
                                {participant.is_attending === false && <><X className="h-2.5 w-2.5" />Declined</>}
                                {participant.is_attending === null && <><Clock className="h-2.5 w-2.5" />Pending</>}
                              </Badge>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </motion.div>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </motion.div>
    );
  };

  return (
    <Card className="border-primary/20 overflow-hidden">
      <CardHeader className="pb-4 bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <motion.div
              whileHover={{ rotate: 15 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <CalendarIcon className="h-5 w-5 text-primary" />
            </motion.div>
            All Meetings
            <Badge variant="secondary" className="ml-2">
              {filteredMeetings.length} total
            </Badge>
          </CardTitle>
          <Select value={selectedUserFilter} onValueChange={onUserFilterChange}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Filter by user" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  All Users
                </span>
              </SelectItem>
              {allProfiles.map((profile) => (
                <SelectItem key={profile.id} value={profile.id}>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={profile.avatar_url || undefined} />
                      <AvatarFallback className="text-[10px]">
                        {profile.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 
                         profile.email.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {profile.full_name || profile.email.split('@')[0]}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue="upcoming" className="w-full">
          <div className="px-4 pt-2">
            <TabsList className="w-full grid grid-cols-2 h-12">
              <TabsTrigger value="upcoming" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <CalendarCheck className="h-4 w-4" />
                <span>Upcoming</span>
                <Badge variant="outline" className="ml-1 bg-background/50">
                  {upcomingMeetings.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="past" className="gap-2 data-[state=active]:bg-muted">
                <History className="h-4 w-4" />
                <span>Past</span>
                <Badge variant="outline" className="ml-1 bg-background/50">
                  {pastMeetings.length}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="upcoming" className="mt-0">
            <ScrollArea className="h-[500px]">
              <div className="p-4 space-y-3">
                {upcomingMeetings.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center py-16 text-center"
                  >
                    <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                      <CalendarCheck className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <p className="text-muted-foreground font-medium">No upcoming meetings</p>
                    <p className="text-sm text-muted-foreground/70 mt-1">
                      Scheduled meetings will appear here
                    </p>
                  </motion.div>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {upcomingMeetings
                      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
                      .map((meeting, index) => (
                        <MeetingCard key={meeting.id} meeting={meeting} index={index} />
                      ))}
                  </AnimatePresence>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="past" className="mt-0">
            <ScrollArea className="h-[500px]">
              <div className="p-4 space-y-3">
                {pastMeetings.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center py-16 text-center"
                  >
                    <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                      <History className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <p className="text-muted-foreground font-medium">No past meetings</p>
                    <p className="text-sm text-muted-foreground/70 mt-1">
                      Completed meetings will appear here
                    </p>
                  </motion.div>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {pastMeetings
                      .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
                      .map((meeting, index) => (
                        <MeetingCard key={meeting.id} meeting={meeting} index={index} />
                      ))}
                  </AnimatePresence>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

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
} from 'lucide-react';
import { format, isPast, isFuture, isToday } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
      >
        <Collapsible open={isExpanded} onOpenChange={() => setExpandedMeeting(isExpanded ? null : meeting.id)}>
          <Card className={cn(
            'overflow-hidden transition-all duration-200 hover:shadow-md',
            isPastMeeting && 'opacity-75'
          )}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div
                      className="h-3 w-3 rounded-full mt-1.5 flex-shrink-0"
                      style={{ backgroundColor: meeting.projects?.color || '#3b82f6' }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-sm truncate">{meeting.title}</h4>
                        {meeting.is_recurring && (
                          <Repeat className="h-3 w-3 text-muted-foreground" />
                        )}
                        <Badge 
                          variant={meeting.meeting_type === 'online' ? 'default' : 'secondary'} 
                          className="text-[10px] h-5"
                        >
                          {meeting.meeting_type === 'online' ? (
                            <><Video className="h-2.5 w-2.5 mr-1" />Online</>
                          ) : (
                            <><Building2 className="h-2.5 w-2.5 mr-1" />Offline</>
                          )}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="h-3 w-3" />
                          {format(new Date(meeting.start_time), 'MMM d, yyyy')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(meeting.start_time), 'h:mm a')}
                        </span>
                        {creator && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {creator.full_name || creator.email.split('@')[0]}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {meeting.participants && meeting.participants.length > 0 && (
                      <div className="flex items-center gap-1.5 text-xs">
                        {acceptedCount > 0 && (
                          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">
                            {acceptedCount} ✓
                          </Badge>
                        )}
                        {pendingCount > 0 && (
                          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-200">
                            {pendingCount} ?
                          </Badge>
                        )}
                        {declinedCount > 0 && (
                          <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-200">
                            {declinedCount} ✗
                          </Badge>
                        )}
                      </div>
                    )}
                    <ChevronDown className={cn(
                      'h-4 w-4 text-muted-foreground transition-transform',
                      isExpanded && 'rotate-180'
                    )} />
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 pb-4 border-t bg-muted/30">
                <div className="grid gap-4 pt-4">
                  {/* Project & Location */}
                  <div className="flex flex-wrap gap-4 text-sm">
                    {meeting.projects && (
                      <Badge variant="outline">{meeting.projects.name}</Badge>
                    )}
                    {meeting.location && meeting.meeting_type === 'offline' && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        {meeting.location}
                      </span>
                    )}
                    {meeting.meeting_link && meeting.meeting_type === 'online' && (
                      <a
                        href={meeting.meeting_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        <Video className="h-3.5 w-3.5" />
                        Join Meeting
                      </a>
                    )}
                  </div>

                  {/* Description */}
                  {meeting.description && (
                    <p className="text-sm text-muted-foreground">{meeting.description}</p>
                  )}

                  {/* Participants */}
                  {meeting.participants && meeting.participants.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        Participants ({meeting.participants.length})
                      </h5>
                      <div className="flex flex-wrap gap-2">
                        {meeting.participants.map((participant) => (
                          <div
                            key={participant.id}
                            className={cn(
                              'flex items-center gap-2 px-2 py-1 rounded-full text-xs border',
                              participant.is_attending === true && 'bg-green-500/10 border-green-200',
                              participant.is_attending === false && 'bg-red-500/10 border-red-200',
                              participant.is_attending === null && 'bg-yellow-500/10 border-yellow-200'
                            )}
                          >
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={participant.profiles?.avatar_url || undefined} />
                              <AvatarFallback className="text-[8px]">
                                {participant.profiles?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 
                                 participant.profiles?.email?.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span>{participant.profiles?.full_name || participant.profiles?.email?.split('@')[0]}</span>
                            <span className="opacity-60">
                              {participant.is_attending === true ? '✓' : participant.is_attending === false ? '✗' : '?'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </motion.div>
    );
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            All Meetings
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
      <CardContent>
        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="w-full grid grid-cols-2 mb-4">
            <TabsTrigger value="upcoming" className="gap-2">
              <CalendarCheck className="h-4 w-4" />
              Upcoming ({upcomingMeetings.length})
            </TabsTrigger>
            <TabsTrigger value="past" className="gap-2">
              <History className="h-4 w-4" />
              Past ({pastMeetings.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="upcoming">
            <ScrollArea className="h-[500px] pr-4">
              {upcomingMeetings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CalendarCheck className="h-12 w-12 text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">No upcoming meetings</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence>
                    {upcomingMeetings
                      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
                      .map((meeting, index) => (
                        <MeetingCard key={meeting.id} meeting={meeting} index={index} />
                      ))}
                  </AnimatePresence>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="past">
            <ScrollArea className="h-[500px] pr-4">
              {pastMeetings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <History className="h-12 w-12 text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">No past meetings</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence>
                    {pastMeetings
                      .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
                      .map((meeting, index) => (
                        <MeetingCard key={meeting.id} meeting={meeting} index={index} />
                      ))}
                  </AnimatePresence>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

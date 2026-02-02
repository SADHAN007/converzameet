import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, Video } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { format, isToday, isTomorrow } from 'date-fns';

interface Meeting {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  project_id: string;
  location?: string | null;
  meeting_link?: string | null;
  projects?: { name: string; color: string };
}

interface MeetingTimelineProps {
  meetings: Meeting[];
}

export default function MeetingTimeline({ meetings }: MeetingTimelineProps) {
  const formatMeetingDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return `Today`;
    if (isTomorrow(date)) return `Tomorrow`;
    return format(date, 'EEE, MMM d');
  };

  const formatMeetingTime = (dateStr: string) => {
    return format(new Date(dateStr), 'h:mm a');
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0 }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
    >
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-base sm:text-lg">Upcoming</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Your schedule</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild className="text-xs">
            <Link to="/calendar">
              <Calendar className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">View All</span>
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
          {meetings.length === 0 ? (
            <motion.div 
              className="text-center py-8"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <Calendar className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground/50 mb-3" />
              </motion.div>
              <p className="text-sm text-muted-foreground">No upcoming meetings</p>
              <Button size="sm" variant="outline" className="mt-3" asChild>
                <Link to="/calendar">Schedule one</Link>
              </Button>
            </motion.div>
          ) : (
            <motion.div 
              className="space-y-2"
              variants={container}
              initial="hidden"
              animate="show"
            >
              {meetings.slice(0, 4).map((meeting, index) => (
                <motion.div
                  key={meeting.id}
                  variants={item}
                  whileHover={{ scale: 1.02, x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  className="relative"
                >
                  <div className="flex gap-3 p-3 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-muted/30 transition-all duration-200 cursor-pointer group">
                    {/* Time indicator */}
                    <div className="flex flex-col items-center min-w-[50px] text-center">
                      <span className="text-[10px] font-medium text-primary uppercase">
                        {formatMeetingDate(meeting.start_time)}
                      </span>
                      <span className="text-sm font-bold">
                        {formatMeetingTime(meeting.start_time)}
                      </span>
                    </div>
                    
                    {/* Divider */}
                    <div className="relative">
                      <div 
                        className="w-1 h-full rounded-full"
                        style={{ backgroundColor: meeting.projects?.color || '#3b82f6' }}
                      />
                      <motion.div 
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 bg-background"
                        style={{ borderColor: meeting.projects?.color || '#3b82f6' }}
                        whileHover={{ scale: 1.3 }}
                      />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                        {meeting.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {meeting.projects && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {meeting.projects.name}
                          </Badge>
                        )}
                        {meeting.meeting_link && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Video className="h-3 w-3" />
                            Online
                          </span>
                        )}
                        {meeting.location && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {meeting.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FolderKanban, 
  MessageSquare, 
  Calendar, 
  FileText, 
  TrendingUp,
  Clock,
  Users,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, isToday, isTomorrow, startOfDay, endOfDay, addDays } from 'date-fns';
import { Link } from 'react-router-dom';

interface Project {
  id: string;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
}

interface Meeting {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  project_id: string;
  projects?: { name: string; color: string };
}

interface Activity {
  id: string;
  type: 'message' | 'mom' | 'meeting';
  title: string;
  description: string;
  time: string;
  project?: string;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [stats, setStats] = useState({
    totalProjects: 0,
    totalMeetings: 0,
    totalMoms: 0,
    unreadMessages: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchDashboardData = async () => {
      try {
        // Fetch projects
        const { data: projectsData } = await supabase
          .from('projects')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(4);

        if (projectsData) setProjects(projectsData);

        // Fetch upcoming meetings
        const now = new Date().toISOString();
        const { data: meetingsData } = await supabase
          .from('meetings')
          .select('*, projects(name, color)')
          .gte('start_time', now)
          .order('start_time', { ascending: true })
          .limit(5);

        if (meetingsData) {
          setMeetings(meetingsData.map(m => ({
            ...m,
            projects: m.projects as { name: string; color: string } | undefined
          })));
        }

        // Fetch stats
        const [projectCount, meetingCount, momCount] = await Promise.all([
          supabase.from('projects').select('id', { count: 'exact', head: true }),
          supabase.from('meetings').select('id', { count: 'exact', head: true }).gte('start_time', now),
          supabase.from('moms').select('id', { count: 'exact', head: true }),
        ]);

        setStats({
          totalProjects: projectCount.count || 0,
          totalMeetings: meetingCount.count || 0,
          totalMoms: momCount.count || 0,
          unreadMessages: 0,
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  const formatMeetingDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return `Today, ${format(date, 'h:mm a')}`;
    if (isTomorrow(date)) return `Tomorrow, ${format(date, 'h:mm a')}`;
    return format(date, 'MMM d, h:mm a');
  };

  const statCards = [
    { label: 'Active Projects', value: stats.totalProjects, icon: FolderKanban, color: 'bg-primary' },
    { label: 'Upcoming Meetings', value: stats.totalMeetings, icon: Calendar, color: 'bg-accent' },
    { label: 'Meeting Minutes', value: stats.totalMoms, icon: FileText, color: 'bg-success' },
    { label: 'Unread Messages', value: stats.unreadMessages, icon: MessageSquare, color: 'bg-warning' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Welcome section */}
      <motion.div variants={item}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Welcome back, {user?.email?.split('@')[0]}! 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              Here's what's happening with your projects today.
            </p>
          </div>
          {isAdmin && (
            <Badge variant="secondary" className="text-xs">Admin</Badge>
          )}
        </div>
      </motion.div>

      {/* Stats cards */}
      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                  <p className="text-3xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className={`h-12 w-12 rounded-xl ${stat.color} flex items-center justify-center`}>
                  <stat.icon className="h-6 w-6 text-primary-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Projects section */}
        <motion.div variants={item} className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Recent Projects</CardTitle>
                <CardDescription>Your active project workspaces</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/projects">
                  View all
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {projects.length === 0 ? (
                <div className="text-center py-8">
                  <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">No projects yet</p>
                  {isAdmin && (
                    <Button className="mt-4" size="sm" asChild>
                      <Link to="/projects">Create your first project</Link>
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {projects.map((project) => (
                    <Link
                      key={project.id}
                      to={`/projects/${project.id}`}
                      className="block"
                    >
                      <div className="p-4 rounded-xl border border-border hover:border-primary/50 hover:shadow-md transition-all duration-200 group">
                        <div className="flex items-start gap-3">
                          <div
                            className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: project.color }}
                          >
                            <FolderKanban className="h-5 w-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                              {project.name}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                              {project.description || 'No description'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Upcoming meetings */}
        <motion.div variants={item}>
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Upcoming Meetings</CardTitle>
                <CardDescription>Your schedule for the week</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/calendar">
                  <Calendar className="h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {meetings.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">No upcoming meetings</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {meetings.map((meeting) => (
                    <div
                      key={meeting.id}
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div
                        className="h-2 w-2 rounded-full mt-2 flex-shrink-0"
                        style={{ backgroundColor: meeting.projects?.color || '#3b82f6' }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{meeting.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatMeetingDate(meeting.start_time)}
                        </p>
                        {meeting.projects && (
                          <Badge variant="secondary" className="mt-1 text-xs">
                            {meeting.projects.name}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quick actions */}
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/chat">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Open Chat
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/calendar">
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Meeting
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/mom">
                  <FileText className="h-4 w-4 mr-2" />
                  Create MOM
                </Link>
              </Button>
              {isAdmin && (
                <Button variant="outline" asChild>
                  <Link to="/admin/users">
                    <Users className="h-4 w-4 mr-2" />
                    Manage Users
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

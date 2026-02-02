import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FolderKanban, 
  MessageSquare, 
  Calendar, 
  FileText, 
  TrendingUp,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import StatsCard from '@/components/dashboard/StatsCard';
import ActivityChart from '@/components/dashboard/ActivityChart';
import ProjectProgress from '@/components/dashboard/ProjectProgress';
import MeetingTimeline from '@/components/dashboard/MeetingTimeline';
import QuickActions from '@/components/dashboard/QuickActions';
import PWAInstallBanner from '@/components/dashboard/PWAInstallBanner';

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
  location?: string | null;
  meeting_link?: string | null;
  projects?: { name: string; color: string };
}

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
          .limit(6);

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

  // Sample chart data (in production, fetch from DB)
  const activityData = [
    { name: 'Mon', meetings: 2, moms: 1 },
    { name: 'Tue', meetings: 3, moms: 2 },
    { name: 'Wed', meetings: 1, moms: 3 },
    { name: 'Thu', meetings: 4, moms: 2 },
    { name: 'Fri', meetings: 2, moms: 4 },
    { name: 'Sat', meetings: 0, moms: 1 },
    { name: 'Sun', meetings: 1, moms: 0 },
  ];

  const projectProgressData = projects.slice(0, 4).map(p => ({
    name: p.name,
    value: Math.floor(Math.random() * 10) + 1,
    color: p.color,
  }));

  const statCards = [
    { label: 'Active Projects', value: stats.totalProjects, icon: FolderKanban, color: 'bg-primary' },
    { label: 'Upcoming Meetings', value: stats.totalMeetings, icon: Calendar, color: 'bg-accent' },
    { label: 'Meeting Notes', value: stats.totalMoms, icon: FileText, color: 'bg-success' },
    { label: 'Messages', value: stats.unreadMessages, icon: MessageSquare, color: 'bg-warning' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div 
          className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-8">
      {/* PWA Install Banner */}
      <PWAInstallBanner />

      {/* Welcome section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2"
      >
        <div>
          <motion.h1 
            className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <motion.span
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ repeat: Infinity, duration: 2, repeatDelay: 3 }}
            >
              👋
            </motion.span>
            Welcome, {user?.email?.split('@')[0]}!
          </motion.h1>
          <motion.p 
            className="text-sm text-muted-foreground mt-0.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Here's what's happening today
          </motion.p>
        </div>
        {isAdmin && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, type: "spring" }}
          >
            <Badge variant="secondary" className="text-xs flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Admin
            </Badge>
          </motion.div>
        )}
      </motion.div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((stat, index) => (
          <StatsCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            icon={stat.icon}
            color={stat.color}
            delay={index * 0.1}
          />
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2">
          <ActivityChart data={activityData} />
        </div>
        <div>
          <ProjectProgress data={projectProgressData.length > 0 ? projectProgressData : [
            { name: 'No projects', value: 1, color: '#94a3b8' }
          ]} />
        </div>
      </div>

      {/* Projects and Meetings row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Projects section */}
        <motion.div 
          className="lg:col-span-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base sm:text-lg">Projects</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Your active workspaces</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild className="text-xs">
                <Link to="/projects">
                  <span className="hidden sm:inline mr-1">View all</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
              {projects.length === 0 ? (
                <motion.div 
                  className="text-center py-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  >
                    <FolderKanban className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground/50 mb-3" />
                  </motion.div>
                  <p className="text-sm text-muted-foreground">No projects yet</p>
                  {isAdmin && (
                    <Button className="mt-4" size="sm" asChild>
                      <Link to="/projects">Create your first project</Link>
                    </Button>
                  )}
                </motion.div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {projects.slice(0, 6).map((project, index) => (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * index }}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Link to={`/projects/${project.id}`} className="block">
                        <div className="p-3 sm:p-4 rounded-xl border border-border hover:border-primary/50 hover:shadow-md transition-all duration-200 group bg-card">
                          <div className="flex items-start gap-3">
                            <motion.div
                              className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: project.color }}
                              whileHover={{ rotate: 10 }}
                            >
                              <FolderKanban className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                            </motion.div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                                {project.name}
                              </h3>
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                {project.description || 'No description'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Meetings timeline */}
        <MeetingTimeline meetings={meetings} />
      </div>

      {/* Quick actions */}
      <QuickActions isAdmin={isAdmin} />
    </div>
  );
}

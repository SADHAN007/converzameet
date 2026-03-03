import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useMissedCalls } from '@/hooks/useMissedCalls';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useUserProfile } from '@/hooks/useUserProfile';
import {
  LayoutDashboard,
  FolderKanban,
  MessageSquare,
  MessagesSquare,
  Calendar,
  FileText,
  Phone,
  Users,
  UserPlus,
  LogOut,
  ChevronLeft,
  UserCircle,
  Download,
  CheckCircle,
  ClipboardList,
  Megaphone,
  Palette,
  BarChart3,
  Receipt,
  Contact,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import ThemedLogo from '@/components/branding/ThemedLogo';
import { toast } from 'sonner';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  isMobile?: boolean;
}

interface NavItemType {
  to: string;
  icon: typeof LayoutDashboard;
  label: string;
  badge?: number;
}


export default function Sidebar({ collapsed, onToggle, isMobile }: SidebarProps) {
  const location = useLocation();
  const { user, isAdmin, userRole, signOut } = useAuth();
  const { missedCount } = useMissedCalls();
  const { canInstall, isInstalled, promptInstall } = usePWAInstall();
  const { profile } = useUserProfile();

  const handleInstallClick = async () => {
    if (canInstall) {
      const success = await promptInstall();
      if (success) {
        toast.success('App installed successfully!');
      }
    }
  };

  const mainNav: NavItemType[] = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/projects', icon: FolderKanban, label: 'Projects' },
    { to: '/leads', icon: UserPlus, label: 'Leads' },
    { to: '/chat', icon: MessageSquare, label: 'Project Chat' },
    { to: '/messages', icon: MessagesSquare, label: 'Messages' },
    { to: '/calendar', icon: Calendar, label: 'Calendar' },
    { to: '/mom', icon: FileText, label: 'Minutes' },
    { to: '/calls', icon: Phone, label: 'Calls', badge: missedCount },
  ];

  const financeNav: NavItemType[] = [
    { to: '/billing', icon: Receipt, label: 'Billing' },
    { to: '/clients', icon: Contact, label: 'Clients' },
  ];

  const isGraphicDesigner = userRole === 'graphic_designer';
  const showDigitalMarketing = isAdmin || userRole === 'digital_marketer' || isGraphicDesigner;

  const digitalMarketingNav: NavItemType[] = isGraphicDesigner && !isAdmin
    ? [
        { to: '/graphics-design', icon: Palette, label: 'My Tasks' },
      ]
    : [
        { to: '/tasks', icon: ClipboardList, label: 'Task Board' },
        { to: '/digital-marketing', icon: Megaphone, label: 'Digital Marketing' },
        { to: '/graphics-design', icon: Palette, label: 'Graphics Design' },
      ];

  const adminNav: NavItemType[] = [
    { to: '/admin/users', icon: Users, label: 'User Management' },
    { to: '/admin/create-user', icon: UserPlus, label: 'Create User' },
  ];

  const reportsNav: NavItemType[] = [
    { to: '/reports', icon: BarChart3, label: 'Reports Dashboard' },
    { to: '/projects', icon: FolderKanban, label: 'All Projects' },
    { to: '/leads', icon: UserPlus, label: 'All Leads' },
    { to: '/tasks', icon: ClipboardList, label: 'All Tasks' },
    { to: '/calendar', icon: Calendar, label: 'All Meetings' },
    { to: '/mom', icon: FileText, label: 'All Minutes' },
    { to: '/messages', icon: MessagesSquare, label: 'All Messages' },
    { to: '/calls', icon: Phone, label: 'Call Logs' },
  ];

  const getInitials = (name?: string | null, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    }
    return email?.slice(0, 2).toUpperCase() || 'U';
  };

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';

  const NavItem = ({ to, icon: Icon, label, badge }: NavItemType) => {
    const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));

    const content = (
      <NavLink
        to={to}
        className={cn(
          'nav-link relative',
          isActive && 'active'
        )}
      >
        <div className="relative">
          <Icon className="h-5 w-5 flex-shrink-0" />
          {badge !== undefined && badge > 0 && collapsed && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-4 w-4 p-0 flex items-center justify-center text-[10px] font-bold"
            >
              {badge > 9 ? '9+' : badge}
            </Badge>
          )}
        </div>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="truncate flex-1"
          >
            {label}
          </motion.span>
        )}
        {!collapsed && badge !== undefined && badge > 0 && (
          <Badge 
            variant="destructive" 
            className="h-5 min-w-5 px-1.5 flex items-center justify-center text-xs font-bold"
          >
            {badge > 99 ? '99+' : badge}
          </Badge>
        )}
      </NavLink>
    );

    if (collapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right" sideOffset={10}>
            {label} {badge !== undefined && badge > 0 && `(${badge} missed)`}
          </TooltipContent>
        </Tooltip>
      );
    }

    return content;
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="h-screen flex flex-col border-r border-sidebar-border bg-sidebar"
      style={{ background: 'var(--gradient-sidebar)' }}
    >
      {/* Header */}
      <div className={cn(
        "flex items-center justify-between border-b border-sidebar-border px-3",
        collapsed ? "h-16" : "h-28"
      )}>
        <div className={cn(
          "flex items-center justify-center overflow-hidden transition-all duration-200",
          collapsed ? "w-10" : "flex-1"
        )}>
          <ThemedLogo 
            className={cn(
              collapsed ? "h-10 w-10" : "h-28 w-full max-w-[240px]"
            )}
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-8 w-8 flex-shrink-0 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <ChevronLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="space-y-1">
          {mainNav.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </div>

        <div className={cn('pt-4 pb-2', !collapsed && 'px-3')}>
          {!collapsed && (
            <p className="text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider">
              Finance
            </p>
          )}
        </div>
        <div className="space-y-1">
          {financeNav.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </div>

        {showDigitalMarketing && (
          <>
            <div className={cn('pt-4 pb-2', !collapsed && 'px-3')}>
              {!collapsed && (
                <p className="text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider">
                  Digital Marketing & Graphics
                </p>
              )}
            </div>
            <div className="space-y-1">
              {digitalMarketingNav.map((item) => (
                <NavItem key={item.to} {...item} />
              ))}
            </div>
          </>
        )}

        {isAdmin && (
          <>
            <div className={cn('pt-4 pb-2', !collapsed && 'px-3')}>
              {!collapsed && (
                <p className="text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider">
                  Admin
                </p>
              )}
            </div>
            <div className="space-y-1">
              {adminNav.map((item) => (
                <NavItem key={item.to} {...item} />
              ))}
            </div>

            <div className={cn('pt-4 pb-2', !collapsed && 'px-3')}>
              {!collapsed && (
                <p className="text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider">
                  Reports
                </p>
              )}
            </div>
            <div className="space-y-1">
              {reportsNav.map((item) => (
                <NavItem key={`report-${item.to}`} {...item} />
              ))}
            </div>
          </>
        )}
      </nav>

      {/* Bottom links */}
      <div className="px-3 pb-2 space-y-1">
        <NavItem to="/profile" icon={UserCircle} label="My Profile" />
        
        {/* Direct Install Button or Link to Install Page */}
        {isInstalled ? (
          <div className={cn(
            'nav-link opacity-60 cursor-default',
            collapsed && 'justify-center'
          )}>
            <CheckCircle className="h-5 w-5 flex-shrink-0 text-success" />
            {!collapsed && (
              <span className="truncate flex-1 text-success">App Installed</span>
            )}
          </div>
        ) : canInstall ? (
          collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleInstallClick}
                  className="nav-link w-full bg-primary/10 hover:bg-primary/20 border border-primary/30"
                >
                  <Download className="h-5 w-5 flex-shrink-0 text-primary" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={10}>
                Install App Now
              </TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={handleInstallClick}
              className="nav-link w-full bg-primary/10 hover:bg-primary/20 border border-primary/30"
            >
              <Download className="h-5 w-5 flex-shrink-0 text-primary" />
              <span className="truncate flex-1 text-primary font-medium">Install App</span>
            </button>
          )
        ) : (
          <NavItem to="/install" icon={Download} label="Install App" />
        )}
      </div>

      {/* User section */}
      <div className="p-3 border-t border-sidebar-border">
        <div className={cn('flex items-center gap-3 p-2 rounded-lg', !collapsed && 'bg-sidebar-accent/50')}>
          <Avatar className="h-9 w-9 flex-shrink-0 ring-2 ring-sidebar-primary/20">
            <AvatarImage src={profile?.avatar_url || ''} alt={displayName} />
            <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-sm">
              {getInitials(profile?.full_name, user?.email)}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {displayName}
              </p>
              <p className="text-xs text-sidebar-foreground/60 truncate">
                {userRole === 'digital_marketer' ? 'Digital Marketer' : 
                 userRole === 'graphic_designer' ? 'Graphic Designer' :
                 userRole === 'bd_marketing' ? 'BD/Marketing' :
                 userRole === 'manager' ? 'Manager' :
                 userRole === 'client' ? 'Client' :
                 isAdmin ? 'Admin' : 'Member'}
              </p>
            </div>
          )}
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={signOut}
              className="h-8 w-8 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </motion.aside>
  );
}

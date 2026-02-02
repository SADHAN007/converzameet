import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import {
  LayoutDashboard,
  FolderKanban,
  MessageSquare,
  Calendar,
  FileText,
  Users,
  LogOut,
  ChevronLeft,
  UserCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import converzaLogo from '@/assets/converza-logo.png';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  isMobile?: boolean;
}

const mainNav = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/projects', icon: FolderKanban, label: 'Projects' },
  { to: '/chat', icon: MessageSquare, label: 'Chat' },
  { to: '/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/mom', icon: FileText, label: 'Minutes' },
];

const adminNav = [
  { to: '/admin/users', icon: Users, label: 'Users' },
];

export default function Sidebar({ collapsed, onToggle, isMobile }: SidebarProps) {
  const location = useLocation();
  const { user, isAdmin, signOut } = useAuth();

  const getInitials = (email: string) => {
    return email.slice(0, 2).toUpperCase();
  };

  const NavItem = ({ to, icon: Icon, label }: { to: string; icon: typeof LayoutDashboard; label: string }) => {
    const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));

    const content = (
      <NavLink
        to={to}
        className={cn(
          'nav-link',
          isActive && 'active'
        )}
      >
        <Icon className="h-5 w-5 flex-shrink-0" />
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="truncate"
          >
            {label}
          </motion.span>
        )}
      </NavLink>
    );

    if (collapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right" sideOffset={10}>
            {label}
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
      <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
        <img 
          src={converzaLogo} 
          alt="Converza" 
          className={cn(
            "object-contain transition-all duration-200",
            collapsed ? "h-10 w-10" : "h-12 max-w-[140px]"
          )}
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-8 w-8 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
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
          </>
        )}
      </nav>

      {/* Profile link */}
      <div className="px-3 pb-2">
        <NavItem to="/profile" icon={UserCircle} label="My Profile" />
      </div>

      {/* User section */}
      <div className="p-3 border-t border-sidebar-border">
        <div className={cn('flex items-center gap-3 p-2 rounded-lg', !collapsed && 'bg-sidebar-accent/50')}>
          <Avatar className="h-9 w-9 flex-shrink-0">
            <AvatarImage src="" />
            <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-sm">
              {user?.email ? getInitials(user.email) : 'U'}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {user?.email?.split('@')[0]}
              </p>
              <p className="text-xs text-sidebar-foreground/60 truncate">
                {isAdmin ? 'Admin' : 'Member'}
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

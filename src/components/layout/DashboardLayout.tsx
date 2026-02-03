import { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Phone } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import Sidebar from './Sidebar';
import Header from './Header';
import { useIsMobile } from '@/hooks/use-mobile';
import ChatBot from '@/components/chat/ChatBot';
import IncomingCallAlert from '@/components/call/IncomingCallAlert';
import StartCallDialog from '@/components/call/StartCallDialog';
import FullPageLoader from '@/components/ui/FullPageLoader';

export default function DashboardLayout() {
  const { user, isLoading } = useAuth();
  const isMobile = useIsMobile();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (isLoading) {
    return <FullPageLoader text="Loading your workspace..." />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile overlay */}
      {isMobile && mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      
      {/* Sidebar - hidden on mobile by default, shown as overlay when open */}
      <div className={`
        ${isMobile ? 'fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out' : ''}
        ${isMobile && !mobileMenuOpen ? '-translate-x-full' : 'translate-x-0'}
      `}>
        <Sidebar 
          collapsed={isMobile ? false : sidebarCollapsed} 
          onToggle={() => {
            if (isMobile) {
              setMobileMenuOpen(false);
            } else {
              setSidebarCollapsed(!sidebarCollapsed);
            }
          }}
          isMobile={isMobile}
        />
      </div>
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} 
          showMenuButton={isMobile}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
      
      {/* Floating Start Call Button */}
      <StartCallDialog
        trigger={
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="fixed bottom-24 right-6 z-40 h-14 w-14 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 text-white shadow-lg shadow-emerald-500/30 flex items-center justify-center hover:shadow-xl hover:shadow-emerald-500/40 transition-shadow"
          >
            <Phone className="h-6 w-6" />
          </motion.button>
        }
      />
      
      {/* Floating ChatBot */}
      <ChatBot />
      
      {/* Global Incoming Call Alert */}
      <IncomingCallAlert />
    </div>
  );
}

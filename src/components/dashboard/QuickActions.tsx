import { motion } from 'framer-motion';
import { MessageSquare, Calendar, FileText, Users, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface QuickActionsProps {
  isAdmin: boolean;
}

const actions = [
  { 
    icon: MessageSquare, 
    label: 'Chat', 
    href: '/chat', 
    color: 'bg-accent hover:bg-accent/90',
    description: 'Team messages'
  },
  { 
    icon: Calendar, 
    label: 'Meeting', 
    href: '/calendar', 
    color: 'bg-primary hover:bg-primary/90',
    description: 'Schedule now'
  },
  { 
    icon: FileText, 
    label: 'Notes', 
    href: '/mom', 
    color: 'bg-success hover:bg-success/90',
    description: 'Create MOM'
  },
];

export default function QuickActions({ isAdmin }: QuickActionsProps) {
  const allActions = isAdmin 
    ? [...actions, { 
        icon: Users, 
        label: 'Users', 
        href: '/admin/users', 
        color: 'bg-warning hover:bg-warning/90',
        description: 'Manage team'
      }]
    : actions;

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const item = {
    hidden: { opacity: 0, scale: 0.8 },
    show: { opacity: 1, scale: 1 }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
    >
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
          <motion.div 
            className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3"
            variants={container}
            initial="hidden"
            animate="show"
          >
            {allActions.map((action, index) => (
              <motion.div key={action.label} variants={item}>
                <Link to={action.href}>
                  <motion.div
                    className={`${action.color} text-white rounded-xl p-3 sm:p-4 text-center cursor-pointer transition-all duration-200`}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <motion.div
                      className="mx-auto mb-2"
                      whileHover={{ rotate: 10 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <action.icon className="h-5 w-5 sm:h-6 sm:w-6 mx-auto" />
                    </motion.div>
                    <p className="text-xs sm:text-sm font-medium">{action.label}</p>
                    <p className="text-[10px] opacity-80 hidden sm:block">{action.description}</p>
                  </motion.div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

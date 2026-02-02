import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface StatsCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  color: string;
  trend?: number;
  delay?: number;
}

export default function StatsCard({ label, value, icon: Icon, color, trend, delay = 0 }: StatsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.4, 
        delay,
        type: "spring",
        stiffness: 100
      }}
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card className="relative overflow-hidden group cursor-pointer">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">{label}</p>
              <motion.p 
                className="text-2xl sm:text-3xl font-bold"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: delay + 0.2 }}
              >
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: delay + 0.3 }}
                >
                  {value}
                </motion.span>
              </motion.p>
              {trend !== undefined && (
                <motion.p 
                  className={`text-xs ${trend >= 0 ? 'text-success' : 'text-destructive'}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: delay + 0.4 }}
                >
                  {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% from last week
                </motion.p>
              )}
            </div>
            <motion.div 
              className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl ${color} flex items-center justify-center shadow-lg`}
              whileHover={{ rotate: 10, scale: 1.1 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
            </motion.div>
          </div>
          
          {/* Animated background gradient */}
          <motion.div
            className={`absolute inset-0 ${color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}
          />
        </CardContent>
      </Card>
    </motion.div>
  );
}

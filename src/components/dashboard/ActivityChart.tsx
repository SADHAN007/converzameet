import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ActivityChartProps {
  data: { name: string; meetings: number; moms: number }[];
}

export default function ActivityChart({ data }: ActivityChartProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base sm:text-lg">Weekly Activity</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Meetings and notes over time</CardDescription>
        </CardHeader>
        <CardContent className="p-2 sm:p-6 pt-0 sm:pt-0">
          <div className="h-[200px] sm:h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMeetings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(217 91% 60%)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(217 91% 60%)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorMoms" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142 76% 36%)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(142 76% 36%)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" opacity={0.5} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 10, fill: 'hsl(220 9% 46%)' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: 'hsl(220 9% 46%)' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(0 0% 100%)',
                    border: '1px solid hsl(220 13% 91%)',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px hsl(217 33% 17% / 0.1)',
                    fontSize: '12px'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="meetings"
                  stroke="hsl(217 91% 60%)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorMeetings)"
                  animationDuration={1500}
                  animationEasing="ease-out"
                />
                <Area
                  type="monotone"
                  dataKey="moms"
                  stroke="hsl(142 76% 36%)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorMoms)"
                  animationDuration={1500}
                  animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 sm:gap-6 mt-3">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-accent" />
              <span className="text-xs text-muted-foreground">Meetings</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-success" />
              <span className="text-xs text-muted-foreground">Notes</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

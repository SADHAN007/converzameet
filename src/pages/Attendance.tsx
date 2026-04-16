import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Users, UserCheck, UserX, Clock, CalendarOff, Check, X, Minus, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { useAttendance } from '@/hooks/useAttendance';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const STATUS_CONFIG: Record<string, { icon: typeof Check; color: string; bg: string; label: string }> = {
  present: { icon: Check, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30', label: 'Present' },
  absent: { icon: X, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950/30', label: 'Absent' },
  late: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/30', label: 'Late' },
  half_day: { icon: Sun, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/30', label: 'Half Day' },
  leave: { icon: CalendarOff, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/30', label: 'Leave' },
};

const STATUS_CYCLE = ['present', 'absent', 'late', 'half_day', 'leave'];

export default function Attendance() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [search, setSearch] = useState('');
  const { isAdmin, userRole } = useAuth();
  const { employees, loading, markAttendance, summary } = useAttendance(year, month);

  const canMark = isAdmin || userRole === 'manager';

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const filteredEmployees = useMemo(() => {
    if (!search) return employees;
    const q = search.toLowerCase();
    return employees.filter(e =>
      (e.full_name || '').toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q)
    );
  }, [employees, search]);

  const handlePrevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };

  const handleNextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const handleCellClick = (employeeId: string, day: number) => {
    if (!canMark) return;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const emp = employees.find(e => e.id === employeeId);
    const currentStatus = emp?.attendance[dateStr]?.status;
    const currentIdx = currentStatus ? STATUS_CYCLE.indexOf(currentStatus) : -1;
    const nextStatus = STATUS_CYCLE[(currentIdx + 1) % STATUS_CYCLE.length];
    markAttendance(employeeId, dateStr, nextStatus);
  };

  const isWeekend = (day: number) => {
    const d = new Date(year, month, day);
    return d.getDay() === 0 || d.getDay() === 6;
  };

  const isToday = (day: number) => {
    return year === today.getFullYear() && month === today.getMonth() && day === today.getDate();
  };

  const getInitials = (name?: string | null, email?: string) => {
    if (name) return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    return email?.slice(0, 2).toUpperCase() || 'U';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Attendance Management</h1>
          <p className="text-muted-foreground">Track and manage employee attendance</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[180px] text-center font-semibold text-lg">
            {MONTHS[month]} {year}
          </div>
          <Button variant="outline" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Employees', value: employees.length, icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Present Today', value: summary.present, icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
          { label: 'Absent Today', value: summary.absent, icon: UserX, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950/30' },
          { label: 'Late Today', value: summary.late, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/30' },
          { label: 'On Leave', value: summary.leave, icon: CalendarOff, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/30' },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn('p-2.5 rounded-xl', card.bg)}>
                    <card.icon className={cn('h-5 w-5', card.color)} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{card.value}</p>
                    <p className="text-xs text-muted-foreground">{card.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Legend + Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1.5 text-xs">
              <div className={cn('w-6 h-6 rounded flex items-center justify-center', cfg.bg)}>
                <cfg.icon className={cn('h-3.5 w-3.5', cfg.color)} />
              </div>
              <span className="text-muted-foreground">{cfg.label}</span>
            </div>
          ))}
        </div>
        <Input
          placeholder="Search employee..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {/* Attendance Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="sticky left-0 z-10 bg-muted/50 backdrop-blur-sm px-4 py-3 text-left font-medium min-w-[200px]">
                    Employee
                  </th>
                  {days.map(day => (
                    <th
                      key={day}
                      className={cn(
                        'px-1 py-3 text-center font-medium min-w-[40px]',
                        isWeekend(day) && 'bg-muted/80 text-muted-foreground/60',
                        isToday(day) && 'bg-primary/10 text-primary font-bold'
                      )}
                    >
                      <div className="text-xs text-muted-foreground/60">
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][new Date(year, month, day).getDay()]}
                      </div>
                      <div>{day}</div>
                    </th>
                  ))}
                  <th className="px-3 py-3 text-center font-medium min-w-[50px]">P</th>
                  <th className="px-3 py-3 text-center font-medium min-w-[50px]">A</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp, idx) => {
                  let presentCount = 0;
                  let absentCount = 0;
                  Object.values(emp.attendance).forEach(r => {
                    if (r.status === 'present' || r.status === 'late') presentCount++;
                    if (r.status === 'absent') absentCount++;
                  });

                  return (
                    <motion.tr
                      key={emp.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.02 }}
                      className="border-b hover:bg-muted/30 transition-colors"
                    >
                      <td className="sticky left-0 z-10 bg-background/95 backdrop-blur-sm px-4 py-2.5 border-r">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={emp.avatar_url || ''} />
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {getInitials(emp.full_name, emp.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{emp.full_name || emp.email.split('@')[0]}</p>
                            <p className="text-xs text-muted-foreground truncate">{emp.job_title || emp.email}</p>
                          </div>
                        </div>
                      </td>
                      {days.map(day => {
                        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const rec = emp.attendance[dateStr];
                        const weekend = isWeekend(day);
                        const todayCell = isToday(day);
                        const cfg = rec ? STATUS_CONFIG[rec.status] : null;

                        return (
                          <td
                            key={day}
                            className={cn(
                              'px-1 py-2 text-center',
                              weekend && 'bg-muted/40',
                              todayCell && 'bg-primary/5',
                              canMark && 'cursor-pointer hover:bg-accent/50 transition-colors'
                            )}
                            onClick={() => handleCellClick(emp.id, day)}
                          >
                            {cfg ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className={cn('w-7 h-7 rounded-md flex items-center justify-center mx-auto', cfg.bg)}>
                                    <cfg.icon className={cn('h-3.5 w-3.5', cfg.color)} />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>{cfg.label}</TooltipContent>
                              </Tooltip>
                            ) : weekend ? (
                              <div className="w-7 h-7 rounded-md flex items-center justify-center mx-auto bg-muted/60">
                                <Minus className="h-3 w-3 text-muted-foreground/40" />
                              </div>
                            ) : (
                              <div className="w-7 h-7 rounded-md mx-auto" />
                            )}
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 text-center">
                        <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 font-bold">
                          {presentCount}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Badge variant="secondary" className="bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 font-bold">
                          {absentCount}
                        </Badge>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>

            {filteredEmployees.length === 0 && !loading && (
              <div className="text-center py-12 text-muted-foreground">
                No employees found
              </div>
            )}
          </div>
        </Card>
      )}

      {canMark && (
        <p className="text-xs text-muted-foreground text-center">
          💡 Click on any cell to cycle through: Present → Absent → Late → Half Day → Leave
        </p>
      )}
    </motion.div>
  );
}

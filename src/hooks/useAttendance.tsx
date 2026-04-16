import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  status: string;
  check_in_time: string | null;
  check_out_time: string | null;
  notes: string | null;
  marked_by: string | null;
}

export interface EmployeeWithAttendance {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  job_title: string | null;
  attendance: Record<string, AttendanceRecord>;
}

export function useAttendance(year: number, month: number) {
  const { user, isAdmin } = useAuth();
  const [employees, setEmployees] = useState<EmployeeWithAttendance[]>([]);
  const [loading, setLoading] = useState(true);

  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const endDate = new Date(year, month + 1, 0);
  const endDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, job_title')
        .eq('is_active', true);

      if (profilesError) throw profilesError;

      // Fetch attendance for the month
      const { data: attendance, error: attError } = await supabase
        .from('attendance')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDateStr);

      if (attError) throw attError;

      // Map attendance to employees
      const attendanceMap: Record<string, Record<string, AttendanceRecord>> = {};
      (attendance || []).forEach((rec: any) => {
        if (!attendanceMap[rec.employee_id]) attendanceMap[rec.employee_id] = {};
        attendanceMap[rec.employee_id][rec.date] = rec;
      });

      const result: EmployeeWithAttendance[] = (profiles || []).map(p => ({
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        avatar_url: p.avatar_url,
        job_title: p.job_title,
        attendance: attendanceMap[p.id] || {},
      }));

      setEmployees(result);
    } catch (err: any) {
      console.error('Error fetching attendance:', err);
    } finally {
      setLoading(false);
    }
  }, [user, startDate, endDateStr]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const markAttendance = async (employeeId: string, date: string, status: string) => {
    if (!user) return;
    
    const { error } = await supabase
      .from('attendance')
      .upsert(
        {
          employee_id: employeeId,
          date,
          status,
          marked_by: user.id,
        },
        { onConflict: 'employee_id,date' }
      );

    if (error) {
      toast.error('Failed to mark attendance');
      console.error(error);
      return;
    }

    toast.success('Attendance updated');
    fetchData();
  };

  const summary = {
    present: 0,
    absent: 0,
    late: 0,
    half_day: 0,
    leave: 0,
  };

  const today = new Date().toISOString().split('T')[0];
  employees.forEach(emp => {
    const rec = emp.attendance[today];
    if (rec) {
      if (rec.status === 'present') summary.present++;
      else if (rec.status === 'absent') summary.absent++;
      else if (rec.status === 'late') summary.late++;
      else if (rec.status === 'half_day') summary.half_day++;
      else if (rec.status === 'leave') summary.leave++;
    }
  });

  return { employees, loading, markAttendance, summary, refetch: fetchData };
}

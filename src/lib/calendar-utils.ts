import { format } from 'date-fns';

interface MeetingForExport {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  location: string | null;
  meeting_link: string | null;
  is_recurring?: boolean;
  recurrence_pattern?: string | null;
  recurrence_interval?: number | null;
  recurrence_end_date?: string | null;
  recurrence_days?: string[] | null;
}

// Generate ICS file content
export function generateICS(meeting: MeetingForExport): string {
  const formatICSDate = (date: Date): string => {
    return format(date, "yyyyMMdd'T'HHmmss");
  };

  const escapeICS = (str: string): string => {
    return str.replace(/[,;\\]/g, '\\$&').replace(/\n/g, '\\n');
  };

  const start = new Date(meeting.start_time);
  const end = new Date(meeting.end_time);
  const now = new Date();

  let rrule = '';
  if (meeting.is_recurring && meeting.recurrence_pattern) {
    const freq = meeting.recurrence_pattern.toUpperCase();
    rrule = `RRULE:FREQ=${freq}`;
    
    if (meeting.recurrence_interval && meeting.recurrence_interval > 1) {
      rrule += `;INTERVAL=${meeting.recurrence_interval}`;
    }
    
    if (meeting.recurrence_pattern === 'weekly' && meeting.recurrence_days?.length) {
      const dayMap: Record<string, string> = {
        sunday: 'SU', monday: 'MO', tuesday: 'TU', wednesday: 'WE',
        thursday: 'TH', friday: 'FR', saturday: 'SA'
      };
      const days = meeting.recurrence_days.map(d => dayMap[d.toLowerCase()]).filter(Boolean);
      if (days.length) rrule += `;BYDAY=${days.join(',')}`;
    }
    
    if (meeting.recurrence_end_date) {
      rrule += `;UNTIL=${format(new Date(meeting.recurrence_end_date), 'yyyyMMdd')}T235959Z`;
    }
  }

  const location = meeting.location || meeting.meeting_link || '';
  const description = [
    meeting.description || '',
    meeting.meeting_link ? `Join: ${meeting.meeting_link}` : ''
  ].filter(Boolean).join('\\n\\n');

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Lovable//Meeting//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${meeting.id}@lovable.app`,
    `DTSTAMP:${formatICSDate(now)}`,
    `DTSTART:${formatICSDate(start)}`,
    `DTEND:${formatICSDate(end)}`,
    `SUMMARY:${escapeICS(meeting.title)}`,
    description ? `DESCRIPTION:${escapeICS(description)}` : '',
    location ? `LOCATION:${escapeICS(location)}` : '',
    rrule,
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(Boolean).join('\r\n');

  return ics;
}

// Download ICS file
export function downloadICS(meeting: MeetingForExport): void {
  const ics = generateICS(meeting);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${meeting.title.replace(/[^a-z0-9]/gi, '_')}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Generate Google Calendar URL
export function getGoogleCalendarUrl(meeting: MeetingForExport): string {
  const start = new Date(meeting.start_time);
  const end = new Date(meeting.end_time);
  
  const formatGoogleDate = (date: Date): string => {
    return format(date, "yyyyMMdd'T'HHmmss");
  };

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: meeting.title,
    dates: `${formatGoogleDate(start)}/${formatGoogleDate(end)}`,
  });

  if (meeting.description) {
    let desc = meeting.description;
    if (meeting.meeting_link) {
      desc += `\n\nJoin: ${meeting.meeting_link}`;
    }
    params.set('details', desc);
  } else if (meeting.meeting_link) {
    params.set('details', `Join: ${meeting.meeting_link}`);
  }

  if (meeting.location) {
    params.set('location', meeting.location);
  }

  // Add recurrence
  if (meeting.is_recurring && meeting.recurrence_pattern) {
    let recur = `RRULE:FREQ=${meeting.recurrence_pattern.toUpperCase()}`;
    if (meeting.recurrence_interval && meeting.recurrence_interval > 1) {
      recur += `;INTERVAL=${meeting.recurrence_interval}`;
    }
    if (meeting.recurrence_end_date) {
      recur += `;UNTIL=${format(new Date(meeting.recurrence_end_date), 'yyyyMMdd')}`;
    }
    params.set('recur', recur);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// Generate Outlook URL
export function getOutlookCalendarUrl(meeting: MeetingForExport): string {
  const start = new Date(meeting.start_time);
  const end = new Date(meeting.end_time);

  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: meeting.title,
    startdt: start.toISOString(),
    enddt: end.toISOString(),
  });

  if (meeting.description) {
    let body = meeting.description;
    if (meeting.meeting_link) {
      body += `<br><br>Join: <a href="${meeting.meeting_link}">${meeting.meeting_link}</a>`;
    }
    params.set('body', body);
  } else if (meeting.meeting_link) {
    params.set('body', `Join: <a href="${meeting.meeting_link}">${meeting.meeting_link}</a>`);
  }

  if (meeting.location) {
    params.set('location', meeting.location);
  }

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

// Recurrence pattern labels
export const recurrencePatterns = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
] as const;

export const weekDays = [
  { value: 'sunday', label: 'Sun' },
  { value: 'monday', label: 'Mon' },
  { value: 'tuesday', label: 'Tue' },
  { value: 'wednesday', label: 'Wed' },
  { value: 'thursday', label: 'Thu' },
  { value: 'friday', label: 'Fri' },
  { value: 'saturday', label: 'Sat' },
] as const;

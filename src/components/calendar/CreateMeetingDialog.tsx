import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar as CalendarIcon,
  Clock,
  Video,
  Building2,
  Users,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  MapPin,
  Link as LinkIcon,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import RecurrenceOptions from './RecurrenceOptions';

interface Project {
  id: string;
  name: string;
  color: string;
}

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
}

interface NewMeeting {
  title: string;
  description: string;
  project_id: string;
  date: string;
  start_time: string;
  end_time: string;
  location: string;
  meeting_link: string;
  meeting_type: 'online' | 'offline';
  is_recurring: boolean;
  recurrence_pattern: string;
  recurrence_interval: number;
  recurrence_end_date: string;
  recurrence_days: string[];
}

interface CreateMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
  profiles: Profile[];
  currentUserId: string | undefined;
  onCreateMeeting: (meeting: NewMeeting, participants: string[]) => Promise<void>;
  creating: boolean;
}

const STEPS = [
  { id: 'basics', label: 'Details', icon: CalendarIcon },
  { id: 'datetime', label: 'Schedule', icon: Clock },
  { id: 'participants', label: 'Invite', icon: Users },
];

export default function CreateMeetingDialog({
  open,
  onOpenChange,
  projects,
  profiles,
  currentUserId,
  onCreateMeeting,
  creating,
}: CreateMeetingDialogProps) {
  const isMobile = useIsMobile();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [newMeeting, setNewMeeting] = useState<NewMeeting>({
    title: '',
    description: '',
    project_id: '',
    date: '',
    start_time: '',
    end_time: '',
    location: '',
    meeting_link: '',
    meeting_type: 'online',
    is_recurring: false,
    recurrence_pattern: 'weekly',
    recurrence_interval: 1,
    recurrence_end_date: '',
    recurrence_days: [],
  });

  const resetForm = () => {
    setNewMeeting({
      title: '',
      description: '',
      project_id: '',
      date: '',
      start_time: '',
      end_time: '',
      location: '',
      meeting_link: '',
      meeting_type: 'online',
      is_recurring: false,
      recurrence_pattern: 'weekly',
      recurrence_interval: 1,
      recurrence_end_date: '',
      recurrence_days: [],
    });
    setSelectedParticipants([]);
    setCurrentStep(0);
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(resetForm, 200);
  };

  const handleCreate = async () => {
    await onCreateMeeting(newMeeting, selectedParticipants);
    handleClose();
  };

  const canProceedFromStep = (step: number) => {
    switch (step) {
      case 0:
        return newMeeting.title.trim() && newMeeting.project_id;
      case 1:
        return newMeeting.date && newMeeting.start_time && newMeeting.end_time;
      case 2:
        return true;
      default:
        return false;
    }
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    return email.slice(0, 2).toUpperCase();
  };

  const filteredProfiles = profiles.filter(p => p.id !== currentUserId);

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 py-4 border-b border-border/50">
      {STEPS.map((step, index) => {
        const Icon = step.icon;
        const isActive = index === currentStep;
        const isCompleted = index < currentStep;
        return (
          <div key={step.id} className="flex items-center">
            <button
              onClick={() => index <= currentStep && setCurrentStep(index)}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-full transition-all',
                isActive && 'bg-primary text-primary-foreground',
                isCompleted && 'bg-primary/10 text-primary',
                !isActive && !isCompleted && 'text-muted-foreground'
              )}
              disabled={index > currentStep}
            >
              {isCompleted ? (
                <Check className="h-4 w-4" />
              ) : (
                <Icon className="h-4 w-4" />
              )}
              <span className={cn('text-sm font-medium', isMobile && index !== currentStep && 'hidden')}>
                {step.label}
              </span>
            </button>
            {index < STEPS.length - 1 && (
              <ChevronRight className="h-4 w-4 mx-1 text-muted-foreground/50" />
            )}
          </div>
        );
      })}
    </div>
  );

  const renderStep1Basics = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="meeting-title" className="text-sm font-medium">
          Meeting Title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="meeting-title"
          placeholder="e.g., Weekly Team Standup"
          value={newMeeting.title}
          onChange={(e) => setNewMeeting({ ...newMeeting, title: e.target.value })}
          className="h-11"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="meeting-project" className="text-sm font-medium">
          Project <span className="text-destructive">*</span>
        </Label>
        <Select
          value={newMeeting.project_id}
          onValueChange={(value) => setNewMeeting({ ...newMeeting, project_id: value })}
        >
          <SelectTrigger className="h-11">
            <SelectValue placeholder="Select a project" />
          </SelectTrigger>
          <SelectContent>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: project.color }}
                  />
                  {project.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Meeting Type</Label>
        <RadioGroup
          value={newMeeting.meeting_type}
          onValueChange={(value: 'online' | 'offline') => setNewMeeting({ ...newMeeting, meeting_type: value })}
          className="grid grid-cols-2 gap-3"
        >
          <Label
            htmlFor="online"
            className={cn(
              'flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all',
              newMeeting.meeting_type === 'online'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            )}
          >
            <RadioGroupItem value="online" id="online" className="sr-only" />
            <div className={cn(
              'h-10 w-10 rounded-lg flex items-center justify-center',
              newMeeting.meeting_type === 'online' ? 'bg-primary text-primary-foreground' : 'bg-muted'
            )}>
              <Video className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium">Online</p>
              <p className="text-xs text-muted-foreground">Video call</p>
            </div>
          </Label>
          <Label
            htmlFor="offline"
            className={cn(
              'flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all',
              newMeeting.meeting_type === 'offline'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            )}
          >
            <RadioGroupItem value="offline" id="offline" className="sr-only" />
            <div className={cn(
              'h-10 w-10 rounded-lg flex items-center justify-center',
              newMeeting.meeting_type === 'offline' ? 'bg-primary text-primary-foreground' : 'bg-muted'
            )}>
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium">In-Person</p>
              <p className="text-xs text-muted-foreground">Physical location</p>
            </div>
          </Label>
        </RadioGroup>
      </div>

      {newMeeting.meeting_type === 'online' ? (
        <div className="space-y-2">
          <Label htmlFor="meeting-link" className="text-sm font-medium flex items-center gap-2">
            <LinkIcon className="h-4 w-4" />
            Meeting Link
          </Label>
          <Input
            id="meeting-link"
            placeholder="https://meet.google.com/..."
            value={newMeeting.meeting_link}
            onChange={(e) => setNewMeeting({ ...newMeeting, meeting_link: e.target.value })}
            className="h-11"
          />
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="meeting-location" className="text-sm font-medium flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Location
          </Label>
          <Input
            id="meeting-location"
            placeholder="Conference Room A"
            value={newMeeting.location}
            onChange={(e) => setNewMeeting({ ...newMeeting, location: e.target.value })}
            className="h-11"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="meeting-description" className="text-sm font-medium">
          Description
        </Label>
        <Textarea
          id="meeting-description"
          placeholder="What's the meeting about?"
          value={newMeeting.description}
          onChange={(e) => setNewMeeting({ ...newMeeting, description: e.target.value })}
          rows={3}
        />
      </div>
    </motion.div>
  );

  const renderStep2DateTime = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="meeting-date" className="text-sm font-medium">
          Date <span className="text-destructive">*</span>
        </Label>
        <Input
          id="meeting-date"
          type="date"
          value={newMeeting.date}
          onChange={(e) => setNewMeeting({ ...newMeeting, date: e.target.value })}
          className="h-11"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="meeting-start" className="text-sm font-medium">
            Start Time <span className="text-destructive">*</span>
          </Label>
          <Input
            id="meeting-start"
            type="time"
            value={newMeeting.start_time}
            onChange={(e) => setNewMeeting({ ...newMeeting, start_time: e.target.value })}
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="meeting-end" className="text-sm font-medium">
            End Time <span className="text-destructive">*</span>
          </Label>
          <Input
            id="meeting-end"
            type="time"
            value={newMeeting.end_time}
            onChange={(e) => setNewMeeting({ ...newMeeting, end_time: e.target.value })}
            className="h-11"
          />
        </div>
      </div>

      <div className="pt-2">
        <RecurrenceOptions
          isRecurring={newMeeting.is_recurring}
          onIsRecurringChange={(value) => setNewMeeting({ ...newMeeting, is_recurring: value })}
          recurrencePattern={newMeeting.recurrence_pattern}
          onRecurrencePatternChange={(value) => setNewMeeting({ ...newMeeting, recurrence_pattern: value })}
          recurrenceInterval={newMeeting.recurrence_interval}
          onRecurrenceIntervalChange={(value) => setNewMeeting({ ...newMeeting, recurrence_interval: value })}
          recurrenceEndDate={newMeeting.recurrence_end_date}
          onRecurrenceEndDateChange={(value) => setNewMeeting({ ...newMeeting, recurrence_end_date: value })}
          recurrenceDays={newMeeting.recurrence_days}
          onRecurrenceDaysChange={(value) => setNewMeeting({ ...newMeeting, recurrence_days: value })}
        />
      </div>
    </motion.div>
  );

  const renderStep3Participants = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Users className="h-4 w-4" />
          Invite Participants
        </Label>
        {selectedParticipants.length > 0 && (
          <Badge variant="secondary" className="gap-1">
            <Check className="h-3 w-3" />
            {selectedParticipants.length} selected
          </Badge>
        )}
      </div>

      <ScrollArea className="h-[300px] rounded-lg border">
        <div className="p-2 space-y-1">
          {filteredProfiles.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No users available</p>
            </div>
          ) : (
            filteredProfiles.map((profile) => {
              const isSelected = selectedParticipants.includes(profile.id);
              return (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => {
                    setSelectedParticipants(prev =>
                      prev.includes(profile.id)
                        ? prev.filter(id => id !== profile.id)
                        : [...prev, profile.id]
                    );
                  }}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left',
                    isSelected
                      ? 'bg-primary/10 border border-primary/30'
                      : 'hover:bg-muted border border-transparent'
                  )}
                >
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={profile.avatar_url || undefined} />
                      <AvatarFallback>
                        {getInitials(profile.full_name, profile.email)}
                      </AvatarFallback>
                    </Avatar>
                    {isSelected && (
                      <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {profile.full_name || profile.email.split('@')[0]}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
                  </div>
                  <Checkbox checked={isSelected} className="pointer-events-none" />
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>

      {selectedParticipants.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Participants will receive an invitation and can accept or decline
        </p>
      )}
    </motion.div>
  );

  const renderNavigationButtons = () => (
    <div className="flex items-center justify-between gap-3 pt-4 border-t">
      {currentStep > 0 ? (
        <Button variant="outline" onClick={() => setCurrentStep(s => s - 1)}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
      ) : (
        <Button variant="outline" onClick={handleClose}>
          Cancel
        </Button>
      )}
      {currentStep < STEPS.length - 1 ? (
        <Button
          onClick={() => setCurrentStep(s => s + 1)}
          disabled={!canProceedFromStep(currentStep)}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      ) : (
        <Button onClick={handleCreate} disabled={creating}>
          {creating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Scheduling...
            </>
          ) : (
            <>
              <CalendarIcon className="h-4 w-4 mr-2" />
              Schedule Meeting
            </>
          )}
        </Button>
      )}
    </div>
  );

  const content = (
    <div className="space-y-4">
      {renderStepIndicator()}
      <div className={cn('px-1', isMobile ? 'min-h-[400px]' : 'min-h-[350px]')}>
        <AnimatePresence mode="wait">
          {currentStep === 0 && renderStep1Basics()}
          {currentStep === 1 && renderStep2DateTime()}
          {currentStep === 2 && renderStep3Participants()}
        </AnimatePresence>
      </div>
      {renderNavigationButtons()}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="pb-0">
            <DrawerTitle>Schedule New Meeting</DrawerTitle>
            <DrawerDescription>
              Create a meeting and invite participants
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-6 overflow-y-auto">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule New Meeting</DialogTitle>
          <DialogDescription>
            Create a meeting and invite participants
          </DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}

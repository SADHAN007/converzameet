import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, UserPlus, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
}

interface ParticipantSelectorProps {
  profiles: Profile[];
  selectedIds: string[];
  onToggle: (userId: string) => void;
  currentUserId?: string;
  className?: string;
}

export default function ParticipantSelector({ 
  profiles, 
  selectedIds, 
  onToggle, 
  currentUserId,
  className 
}: ParticipantSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  const getDisplayName = (profile: Profile) => {
    return profile.full_name || profile.email.split('@')[0];
  };

  const filteredProfiles = profiles
    .filter(p => p.id !== currentUserId)
    .filter(p => {
      const name = (p.full_name || '').toLowerCase();
      const email = p.email.toLowerCase();
      const query = searchQuery.toLowerCase();
      return name.includes(query) || email.includes(query);
    });

  const selectedProfiles = profiles.filter(p => selectedIds.includes(p.id));

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header with icon */}
      <div className="flex items-center gap-2 text-sm font-medium">
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <UserPlus className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="font-medium">Tag Participants</p>
          <p className="text-xs text-muted-foreground">
            Select users who need to acknowledge this MOM
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-muted/50"
        />
      </div>

      {/* Selected Participants Pills */}
      <AnimatePresence>
        {selectedProfiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-2"
          >
            {selectedProfiles.map((profile) => (
              <motion.div
                key={profile.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                layout
              >
                <Badge 
                  variant="secondary"
                  className="gap-2 pr-1 pl-1 py-1 bg-primary/10 hover:bg-primary/20 border-primary/20"
                >
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={profile.avatar_url || undefined} />
                    <AvatarFallback className="text-[10px] bg-primary/20">
                      {getInitials(profile.full_name, profile.email)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium">
                    {getDisplayName(profile)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onToggle(profile.id)}
                    className="h-4 w-4 rounded-full hover:bg-destructive/20 flex items-center justify-center transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* User List */}
      <ScrollArea className="h-48 rounded-lg border bg-muted/20">
        <div className="p-2 space-y-1">
          {filteredProfiles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserPlus className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                {searchQuery ? 'No users found' : 'No other users available'}
              </p>
            </div>
          ) : (
            filteredProfiles.map((profile) => {
              const isSelected = selectedIds.includes(profile.id);
              return (
                <motion.button
                  key={profile.id}
                  type="button"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => onToggle(profile.id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-2.5 rounded-lg transition-all text-left",
                    isSelected 
                      ? "bg-primary/15 ring-1 ring-primary/30" 
                      : "hover:bg-muted"
                  )}
                >
                  <div className="relative">
                    <Avatar className="h-9 w-9 ring-2 ring-background">
                      <AvatarImage src={profile.avatar_url || undefined} />
                      <AvatarFallback className="text-xs bg-gradient-to-br from-primary/30 to-primary/10">
                        {getInitials(profile.full_name, profile.email)}
                      </AvatarFallback>
                    </Avatar>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary flex items-center justify-center"
                      >
                        <Check className="h-2.5 w-2.5 text-primary-foreground" />
                      </motion.div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm font-medium truncate",
                      isSelected && "text-primary"
                    )}>
                      {getDisplayName(profile)}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {profile.email}
                    </p>
                  </div>
                  <div className={cn(
                    "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors",
                    isSelected 
                      ? "border-primary bg-primary" 
                      : "border-muted-foreground/30"
                  )}>
                    {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                  </div>
                </motion.button>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Selected count */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {selectedIds.length} participant{selectedIds.length !== 1 ? 's' : ''} selected
        </span>
        {selectedIds.length > 0 && (
          <button
            type="button"
            onClick={() => selectedIds.forEach(id => onToggle(id))}
            className="text-destructive hover:underline"
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}
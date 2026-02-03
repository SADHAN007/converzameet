import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Paperclip, X, FileText, Image, Music, Upload, Loader2, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Attachment {
  id?: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  isUploading?: boolean;
}

interface FileAttachmentProps {
  attachments: Attachment[];
  onAttachmentsChange: (attachments: Attachment[] | ((prev: Attachment[]) => Attachment[])) => void;
  momId?: string;
  userId?: string;
  readonly?: boolean;
  className?: string;
}

const ACCEPTED_TYPES = {
  'application/pdf': { icon: FileText, label: 'PDF', color: 'text-red-500' },
  'image/jpeg': { icon: Image, label: 'Image', color: 'text-blue-500' },
  'image/png': { icon: Image, label: 'Image', color: 'text-blue-500' },
  'image/gif': { icon: Image, label: 'Image', color: 'text-blue-500' },
  'image/webp': { icon: Image, label: 'Image', color: 'text-blue-500' },
  'audio/mpeg': { icon: Music, label: 'Audio', color: 'text-purple-500' },
  'audio/wav': { icon: Music, label: 'Audio', color: 'text-purple-500' },
  'audio/ogg': { icon: Music, label: 'Audio', color: 'text-purple-500' },
  'audio/mp4': { icon: Music, label: 'Audio', color: 'text-purple-500' },
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function FileAttachment({
  attachments,
  onAttachmentsChange,
  momId,
  userId,
  readonly = false,
  className,
}: FileAttachmentProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const getFileInfo = (type: string) => {
    return ACCEPTED_TYPES[type as keyof typeof ACCEPTED_TYPES] || { icon: File, label: 'File', color: 'text-muted-foreground' };
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0 || !userId) return;

    const validFiles: File[] = [];
    
    for (const file of Array.from(files)) {
      if (!Object.keys(ACCEPTED_TYPES).includes(file.type)) {
        toast({
          title: 'Invalid file type',
          description: `${file.name} is not a supported file type. Please upload PDF, images, or audio files.`,
          variant: 'destructive',
        });
        continue;
      }
      
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: 'File too large',
          description: `${file.name} exceeds the 10MB limit.`,
          variant: 'destructive',
        });
        continue;
      }
      
      validFiles.push(file);
    }

    // Upload files
    for (const file of validFiles) {
      const tempId = `temp-${Date.now()}-${Math.random()}`;
      const newAttachment: Attachment = {
        id: tempId,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        file_url: '',
        isUploading: true,
      };

      onAttachmentsChange([...attachments, newAttachment]);

      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('mom-attachments')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('mom-attachments')
          .getPublicUrl(fileName);

        // Update attachment with URL
        const updatedAttachment: Attachment = {
          ...newAttachment,
          file_url: publicUrl,
          isUploading: false,
        };

        onAttachmentsChange(prev => 
          prev.map(a => a.id === tempId ? updatedAttachment : a)
        );

        toast({
          title: 'File uploaded',
          description: `${file.name} has been attached.`,
        });
      } catch (error: any) {
        // Remove failed upload
        onAttachmentsChange(prev => prev.filter(a => a.id !== tempId));
        
        toast({
          title: 'Upload failed',
          description: error.message || `Failed to upload ${file.name}`,
          variant: 'destructive',
        });
      }
    }
  };

  const handleRemove = async (attachment: Attachment) => {
    if (attachment.file_url) {
      try {
        // Extract path from URL
        const url = new URL(attachment.file_url);
        const pathParts = url.pathname.split('/');
        const filePath = pathParts.slice(-2).join('/');
        
        await supabase.storage.from('mom-attachments').remove([filePath]);
      } catch (error) {
        console.error('Failed to delete file from storage:', error);
      }
    }

    onAttachmentsChange(attachments.filter(a => a.id !== attachment.id));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center gap-2 text-sm font-medium">
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Paperclip className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="font-medium">Attachments</p>
          <p className="text-xs text-muted-foreground">
            PDF, images, and audio files (max 10MB each)
          </p>
        </div>
      </div>

      {/* Upload Area */}
      {!readonly && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all",
            isDragging 
              ? "border-primary bg-primary/5" 
              : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.mp3,.wav,.ogg,.m4a"
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />
          <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Drop files here or <span className="text-primary font-medium">browse</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            PDF, images (JPG, PNG, GIF, WebP), audio (MP3, WAV, OGG)
          </p>
        </div>
      )}

      {/* Attachments List */}
      <AnimatePresence>
        {attachments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            {attachments.map((attachment) => {
              const fileInfo = getFileInfo(attachment.file_type);
              const Icon = fileInfo.icon;
              
              return (
                <motion.div
                  key={attachment.id || attachment.file_name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border bg-muted/30",
                    attachment.isUploading && "opacity-60"
                  )}
                >
                  <div className={cn("h-10 w-10 rounded-lg bg-background flex items-center justify-center border", fileInfo.color)}>
                    {attachment.isUploading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{attachment.file_name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {fileInfo.label}
                      </Badge>
                      <span>{formatFileSize(attachment.file_size)}</span>
                    </div>
                  </div>
                  {attachment.file_url && !attachment.isUploading && (
                    <a
                      href={attachment.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View
                    </a>
                  )}
                  {!readonly && !attachment.isUploading && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(attachment);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {readonly && attachments.length === 0 && (
        <div className="text-center py-4 text-muted-foreground">
          <Paperclip className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No attachments</p>
        </div>
      )}
    </div>
  );
}

import { useState, useRef } from 'react';
import { Upload, X, FileText, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface TaskFileUploadProps {
  taskId: string;
  onUploaded: () => void;
}

export default function TaskFileUpload({ taskId, onUploaded }: TaskFileUploadProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    const valid = selected.filter(f => {
      const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!allowed.includes(f.type)) {
        toast({ title: 'Invalid file', description: `${f.name} is not JPG, PNG or PDF`, variant: 'destructive' });
        return false;
      }
      if (f.size > 10 * 1024 * 1024) {
        toast({ title: 'File too large', description: `${f.name} exceeds 10MB`, variant: 'destructive' });
        return false;
      }
      return true;
    });
    setFiles(prev => [...prev, ...valid]);
    if (e.target) e.target.value = '';
  };

  const handleUpload = async () => {
    if (!files.length || !user) return;
    setUploading(true);
    try {
      for (const file of files) {
        const ext = file.name.split('.').pop();
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from('task-attachments').upload(path, file);
        if (uploadErr) { console.error(uploadErr); continue; }
        const { data: { publicUrl } } = supabase.storage.from('task-attachments').getPublicUrl(path);
        await supabase.from('task_attachments').insert({
          task_id: taskId,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          file_url: publicUrl,
          uploaded_by: user.id,
        });
      }
      toast({ title: 'Files uploaded successfully' });
      setFiles([]);
      onUploaded();
    } catch (error: any) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs">Upload Files (JPG, PNG, PDF)</Label>
      <div
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed rounded-lg p-3 text-center cursor-pointer hover:border-primary/50 transition-colors"
      >
        <input ref={fileInputRef} type="file" multiple accept=".jpg,.jpeg,.png,.pdf" onChange={handleFileSelect} className="hidden" />
        <Upload className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
        <p className="text-xs text-muted-foreground">Click to select files</p>
      </div>
      {files.length > 0 && (
        <div className="space-y-1">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-2 text-sm bg-muted/30 rounded px-2 py-1">
              {f.type.includes('pdf') ? <FileText className="h-4 w-4 text-red-500" /> : <ImageIcon className="h-4 w-4 text-blue-500" />}
              <span className="truncate flex-1">{f.name}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setFiles(files.filter((_, j) => j !== i))}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
          <Button onClick={handleUpload} disabled={uploading} size="sm" className="w-full gap-1">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Upload {files.length} file{files.length > 1 ? 's' : ''}
          </Button>
        </div>
      )}
    </div>
  );
}

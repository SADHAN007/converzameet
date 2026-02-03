import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextAlign } from '@tiptap/extension-text-align';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Underline } from '@tiptap/extension-underline';
import { Placeholder } from '@tiptap/extension-placeholder';
import { 
  Bold,
  Italic, 
  Underline as UnderlineIcon, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  List,
  ListOrdered,
  Table as TableIcon,
  Undo,
  Redo,
  Trash2,
  Plus,
  Minus,
  Mic,
  MicOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import { toast } from 'sonner';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
}

export default function RichTextEditor({ content, onChange, placeholder, className }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableCell,
      TableHeader,
      Underline,
      Placeholder.configure({
        placeholder: placeholder || 'Start writing your meeting notes...',
      }),
    ],
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px] p-4',
      },
    },
  });

  // Speech to text hook
  const { isListening, isSupported, formattedTime, toggleListening } = useSpeechToText({
    onResult: (transcript) => {
      if (editor && transcript) {
        // Insert transcribed text at cursor position
        editor.chain().focus().insertContent(transcript + ' ').run();
        toast.success('Text added from voice');
      }
    },
    onError: (error) => {
      toast.error(error);
    },
    continuous: true,
    language: 'en-US'
  });

  if (!editor) {
    return null;
  }

  const ToolbarButton = ({ 
    onClick, 
    isActive, 
    children, 
    tooltip 
  }: { 
    onClick: () => void; 
    isActive?: boolean; 
    children: React.ReactNode;
    tooltip: string;
  }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClick}
          className={cn(
            "h-8 w-8 p-0",
            isActive && "bg-primary/20 text-primary"
          )}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p className="text-xs">{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );

  return (
    <TooltipProvider>
      <div className={cn("border rounded-lg overflow-hidden bg-background", className)}>
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-0.5 p-2 border-b bg-muted/30">
          {/* Text Formatting */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            tooltip="Bold (Ctrl+B)"
          >
            <Bold className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            tooltip="Italic (Ctrl+I)"
          >
            <Italic className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            isActive={editor.isActive('underline')}
            tooltip="Underline (Ctrl+U)"
          >
            <UnderlineIcon className="h-4 w-4" />
          </ToolbarButton>

          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* Alignment */}
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            isActive={editor.isActive({ textAlign: 'left' })}
            tooltip="Align Left"
          >
            <AlignLeft className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            isActive={editor.isActive({ textAlign: 'center' })}
            tooltip="Align Center"
          >
            <AlignCenter className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            isActive={editor.isActive({ textAlign: 'right' })}
            tooltip="Align Right"
          >
            <AlignRight className="h-4 w-4" />
          </ToolbarButton>

          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* Lists */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
            tooltip="Bullet List"
          >
            <List className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive('orderedList')}
            tooltip="Numbered List"
          >
            <ListOrdered className="h-4 w-4" />
          </ToolbarButton>

          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* Table Controls */}
          <ToolbarButton
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
            tooltip="Insert Table"
          >
            <TableIcon className="h-4 w-4" />
          </ToolbarButton>
          {editor.isActive('table') && (
            <>
              <ToolbarButton
                onClick={() => editor.chain().focus().addColumnAfter().run()}
                tooltip="Add Column"
              >
                <Plus className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().deleteColumn().run()}
                tooltip="Delete Column"
              >
                <Minus className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().addRowAfter().run()}
                tooltip="Add Row"
              >
                <Plus className="h-4 w-4 rotate-90" />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().deleteRow().run()}
                tooltip="Delete Row"
              >
                <Minus className="h-4 w-4 rotate-90" />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().deleteTable().run()}
                tooltip="Delete Table"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </ToolbarButton>
          </>
          )}

          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* Voice to Text */}
          {isSupported ? (
            <div className="flex items-center gap-1">
              <ToolbarButton
                onClick={toggleListening}
                isActive={isListening}
                tooltip={isListening ? "Stop Recording" : "Start Voice Input"}
              >
                {isListening ? (
                  <MicOff className="h-4 w-4 text-destructive" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </ToolbarButton>
              
              {/* Recording Indicator */}
              {isListening && (
                <div className="flex items-center gap-2 px-2 py-1 bg-destructive/10 border border-destructive/30 rounded-md animate-fade-in">
                  {/* Pulsing dot */}
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive"></span>
                  </span>
                  
                  {/* Recording label and time */}
                  <span className="text-xs font-medium text-destructive">
                    REC {formattedTime}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled
                  className="h-8 w-8 p-0 opacity-50"
                >
                  <Mic className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">Voice input not supported in this browser</p>
              </TooltipContent>
            </Tooltip>
          )}

          <div className="flex-1" />

          {/* Undo/Redo */}
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            tooltip="Undo (Ctrl+Z)"
          >
            <Undo className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            tooltip="Redo (Ctrl+Y)"
          >
            <Redo className="h-4 w-4" />
          </ToolbarButton>
        </div>

        {/* Editor Content */}
        <EditorContent editor={editor} className="min-h-[200px]" />
      </div>
    </TooltipProvider>
  );
}
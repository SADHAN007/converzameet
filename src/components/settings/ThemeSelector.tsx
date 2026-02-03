import { motion } from 'framer-motion';
import { Check, Palette } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTheme, themeColors, ThemeColor } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

export default function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  const themes: { key: ThemeColor; color: string; darkColor: string }[] = [
    { key: 'navy', color: 'bg-[hsl(217,91%,22%)]', darkColor: 'bg-[hsl(217,91%,60%)]' },
    { key: 'teal', color: 'bg-[hsl(175,70%,28%)]', darkColor: 'bg-[hsl(175,70%,45%)]' },
    { key: 'purple', color: 'bg-[hsl(270,60%,35%)]', darkColor: 'bg-[hsl(270,60%,55%)]' },
    { key: 'red', color: 'bg-[hsl(0,70%,40%)]', darkColor: 'bg-[hsl(0,70%,55%)]' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Theme Color
        </CardTitle>
        <CardDescription>
          Choose your preferred color theme for the application
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {themes.map(({ key, color, darkColor }) => (
            <motion.button
              key={key}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setTheme(key)}
              className={cn(
                'relative flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all',
                theme === key
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              )}
            >
              <div className="relative">
                <div
                  className={cn(
                    'w-12 h-12 rounded-full shadow-lg',
                    color
                  )}
                />
                <div
                  className={cn(
                    'absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-background shadow-md',
                    darkColor
                  )}
                />
                {theme === key && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <div className="w-6 h-6 rounded-full bg-white/90 flex items-center justify-center shadow-sm">
                      <Check className="h-4 w-4 text-primary" />
                    </div>
                  </motion.div>
                )}
              </div>
              <span className={cn(
                'text-sm font-medium',
                theme === key ? 'text-primary' : 'text-muted-foreground'
              )}>
                {themeColors[key].name}
              </span>
            </motion.button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

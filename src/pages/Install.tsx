import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, Smartphone, Check, Share, MoreVertical } from 'lucide-react';
import converzaLogo from '@/assets/converza-logo.png';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // Listen for install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const features = [
    'Works offline',
    'Fast loading',
    'Push notifications',
    'Home screen access',
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <img 
            src={converzaLogo} 
            alt="Converza" 
            className="h-20 mx-auto mb-6 object-contain"
          />
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Install Converza
          </h1>
          <p className="text-muted-foreground">
            Get the full app experience on your device
          </p>
        </div>

        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Smartphone className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Mobile App</h3>
                <p className="text-sm text-muted-foreground">Install for quick access</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              {features.map((feature) => (
                <div key={feature} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-success" />
                  <span className="text-muted-foreground">{feature}</span>
                </div>
              ))}
            </div>

            {isInstalled ? (
              <div className="text-center py-4">
                <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3">
                  <Check className="h-6 w-6 text-success" />
                </div>
                <p className="font-medium text-foreground">Already Installed!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Open Converza from your home screen
                </p>
              </div>
            ) : isIOS ? (
              <div className="space-y-4">
                <p className="text-sm text-center text-muted-foreground mb-4">
                  To install on iOS:
                </p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Share className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm">Tap the Share button</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Download className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm">Select "Add to Home Screen"</span>
                  </div>
                </div>
              </div>
            ) : deferredPrompt ? (
              <Button 
                onClick={handleInstall} 
                className="w-full h-12 btn-primary-gradient"
              >
                <Download className="h-5 w-5 mr-2" />
                Install App
              </Button>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-center text-muted-foreground mb-4">
                  To install on Android:
                </p>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <MoreVertical className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm">Open browser menu → "Install app"</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          No app store required. Install directly from your browser.
        </p>
      </motion.div>
    </div>
  );
}

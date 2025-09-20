import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Settings, Save, RotateCcw } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface AgentSettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export const AgentSettingsDialog: React.FC<AgentSettingsDialogProps> = ({
  open,
  onClose,
}) => {
  const [settings, setSettings] = useState({
    autoSave: true,
    notifications: true,
    darkMode: true,
    maxConcurrentAgents: 5,
    memoryRetention: 30,
    apiTimeout: 30,
  });
  const isMobile = useIsMobile();

  const handleSave = () => {
    // Save settings logic would go here
    console.log('Saving settings:', settings);
    onClose();
  };

  const handleReset = () => {
    setSettings({
      autoSave: true,
      notifications: true,
      darkMode: true,
      maxConcurrentAgents: 5,
      memoryRetention: 30,
      apiTimeout: 30,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className={cn(
          'sm:max-w-[500px]',
          isMobile &&
            'h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-none overflow-y-auto rounded-2xl border border-border/50 p-0'
        )}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Global Settings
          </DialogTitle>
          <DialogDescription>
            Configure global settings for your AI agents and automation system.
          </DialogDescription>
        </DialogHeader>

        <div className={cn('space-y-6 py-4', isMobile ? 'px-5' : '')}>
          {/* General Settings */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-foreground">General</h4>

            <div
              className={cn(
                'flex items-center justify-between',
                isMobile && 'flex-col items-start gap-2 rounded-xl border border-border/60 p-3'
              )}
            >
              <div className="space-y-0.5">
                <Label className="text-sm">Auto-save changes</Label>
                <p className="text-xs text-muted-foreground">
                  Automatically save agent configurations
                </p>
              </div>
              <Switch
                checked={settings.autoSave}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, autoSave: checked })
                }
              />
            </div>

            <div
              className={cn(
                'flex items-center justify-between',
                isMobile && 'flex-col items-start gap-2 rounded-xl border border-border/60 p-3'
              )}
            >
              <div className="space-y-0.5">
                <Label className="text-sm">Notifications</Label>
                <p className="text-xs text-muted-foreground">
                  Show system notifications
                </p>
              </div>
              <Switch
                checked={settings.notifications}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, notifications: checked })
                }
              />
            </div>

            <div
              className={cn(
                'flex items-center justify-between',
                isMobile && 'flex-col items-start gap-2 rounded-xl border border-border/60 p-3'
              )}
            >
              <div className="space-y-0.5">
                <Label className="text-sm">Dark mode</Label>
                <p className="text-xs text-muted-foreground">
                  Use dark theme interface
                </p>
              </div>
              <Switch
                checked={settings.darkMode}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, darkMode: checked })
                }
              />
            </div>
          </div>

          <Separator />

          {/* Performance Settings */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-foreground">Performance</h4>
            
            <div className="space-y-2">
              <Label htmlFor="maxAgents" className="text-sm">
                Max Concurrent Agents
              </Label>
              <Input
                id="maxAgents"
                type="number"
                min="1"
                max="20"
                value={settings.maxConcurrentAgents}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    maxConcurrentAgents: parseInt(e.target.value) || 5,
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                Maximum number of agents that can run simultaneously
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="memoryRetention" className="text-sm">
                Memory Retention (days)
              </Label>
              <Input
                id="memoryRetention"
                type="number"
                min="1"
                max="365"
                value={settings.memoryRetention}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    memoryRetention: parseInt(e.target.value) || 30,
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                How long to keep agent memory data
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiTimeout" className="text-sm">
                API Timeout (seconds)
              </Label>
              <Input
                id="apiTimeout"
                type="number"
                min="5"
                max="300"
                value={settings.apiTimeout}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    apiTimeout: parseInt(e.target.value) || 30,
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                Request timeout for agent API calls
              </p>
            </div>
          </div>
        </div>

        <div
          className={cn(
            'flex justify-between',
            isMobile && 'flex-col-reverse gap-3 px-5 pb-5'
          )}
        >
          <Button
            variant="outline"
            onClick={handleReset}
            className={cn(isMobile && 'w-full text-base')}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <div className={cn('flex gap-2', isMobile && 'flex-col-reverse w-full gap-3')}>
            <Button
              variant="outline"
              onClick={onClose}
              className={cn(isMobile && 'w-full text-base')}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className={cn(isMobile && 'w-full text-base')}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
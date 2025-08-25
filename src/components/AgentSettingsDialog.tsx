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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Global Settings
          </DialogTitle>
          <DialogDescription>
            Configure global settings for your AI agents and automation system.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* General Settings */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-foreground">General</h4>
            
            <div className="flex items-center justify-between">
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

            <div className="flex items-center justify-between">
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

            <div className="flex items-center justify-between">
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

        <div className="flex justify-between">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </Button>  
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
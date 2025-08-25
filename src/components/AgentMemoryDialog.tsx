import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, Edit } from 'lucide-react';

interface MemoryItem {
  id: string;
  key: string;
  value: string;
  type: 'fact' | 'preference' | 'skill' | 'context';
  timestamp: string;
}

interface AgentMemoryDialogProps {
  open: boolean;
  onClose: () => void;
  agentId: string;
}

// Mock memory data
const mockMemoryItems: MemoryItem[] = [
  {
    id: '1',
    key: 'user_timezone',
    value: 'UTC-8 (Pacific Time)',
    type: 'fact',
    timestamp: '2024-01-15 10:30:00'
  },
  {
    id: '2',
    key: 'preferred_communication_style',
    value: 'Concise and professional',
    type: 'preference',
    timestamp: '2024-01-14 15:22:00'
  },
  {
    id: '3',
    key: 'learned_automation_pattern',
    value: 'User prefers email notifications sent at 9 AM daily',
    type: 'skill',
    timestamp: '2024-01-12 09:15:00'
  }
];

export const AgentMemoryDialog: React.FC<AgentMemoryDialogProps> = ({ open, onClose, agentId }) => {
  const [memoryItems, setMemoryItems] = useState<MemoryItem[]>(mockMemoryItems);
  const [newItem, setNewItem] = useState({ key: '', value: '', type: 'fact' as const });
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleAddMemory = () => {
    if (!newItem.key.trim() || !newItem.value.trim()) return;
    
    const item: MemoryItem = {
      id: Date.now().toString(),
      key: newItem.key.trim(),
      value: newItem.value.trim(),
      type: newItem.type,
      timestamp: new Date().toLocaleString()
    };
    
    setMemoryItems([item, ...memoryItems]);
    setNewItem({ key: '', value: '', type: 'fact' });
  };

  const handleDeleteMemory = (id: string) => {
    setMemoryItems(memoryItems.filter(item => item.id !== id));
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'fact':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'preference':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'skill':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'context':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            Agent Memory Store
            <Badge variant="outline" className="text-xs">
              {memoryItems.length} items
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Add new memory item */}
          <div className="gradient-card p-4 rounded-lg border border-border/50 space-y-3">
            <h3 className="text-sm font-medium">Add Memory Item</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input
                placeholder="Memory key (e.g., user_preference)"
                value={newItem.key}
                onChange={(e) => setNewItem({ ...newItem, key: e.target.value })}
              />
              <select
                className="px-3 py-2 bg-input border border-border rounded-md text-sm"
                value={newItem.type}
                onChange={(e) => setNewItem({ ...newItem, type: e.target.value as any })}
              >
                <option value="fact">Fact</option>
                <option value="preference">Preference</option>
                <option value="skill">Skill</option>
                <option value="context">Context</option>
              </select>
            </div>
            <Textarea
              placeholder="Memory value or description..."
              value={newItem.value}
              onChange={(e) => setNewItem({ ...newItem, value: e.target.value })}
              rows={2}
            />
            <Button 
              onClick={handleAddMemory}
              size="sm"
              className="w-full bg-gradient-primary"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Memory
            </Button>
          </div>

          {/* Memory items list */}
          <ScrollArea className="h-96">
            <div className="space-y-3 pr-3">
              {memoryItems.map((item, index) => (
                <div key={item.id}>
                  <div className="agent-card p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{item.key}</span>
                          <Badge className={getTypeColor(item.type)}>
                            {item.type}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{item.value}</p>
                        <p className="text-xs text-muted-foreground">
                          Added: {item.timestamp}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost" 
                          size="sm"
                          onClick={() => setEditingId(item.id)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteMemory(item.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  {index < memoryItems.length - 1 && <Separator />}
                </div>
              ))}
              
              {memoryItems.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No memory items yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Add your first memory item above to get started.
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};
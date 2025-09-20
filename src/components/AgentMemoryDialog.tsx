import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';


type MemoryType = MemoryItem['type'];

interface AgentMemoryDialogProps {
  open: boolean;
  onClose: () => void;
  agentId: string;
}

type MemoryDraft = Pick<AgentMemory, 'key' | 'value' | 'type'>;

const emptyDraft: MemoryDraft = { key: '', value: '', type: 'fact' };

export const AgentMemoryDialog: React.FC<AgentMemoryDialogProps> = ({ open, onClose, agentId }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<MemoryDraft>(emptyDraft);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!open || !agentId) {
      return;
    }
    setIsLoading(true);
    fetchAgentMemory(agentId)
      .then((items) => setMemoryItems(items))
      .catch((error: any) => {
        toast({
          title: 'Unable to load memory',
          description: error?.message ?? 'Something went wrong while loading memory entries.',
          variant: 'destructive',
        });
      })
      .finally(() => setIsLoading(false));
  }, [open, agentId, fetchAgentMemory, toast]);

  const resetEditor = () => {
    setEditingId(null);
    setEditDraft(emptyDraft);
  };

  const handleAddMemory = async () => {
    if (!agentId || !newItem.key.trim() || !newItem.value.trim()) return;
    setIsSubmitting(true);
    try {
      const memory = await addMemoryItem(agentId, {
        key: newItem.key.trim(),
        value: newItem.value.trim(),
        type: newItem.type,
      });
      if (memory) {
        setMemoryItems((items) => [memory, ...items]);
        setNewItem(emptyDraft);
        toast({ title: 'Memory added', description: 'The memory item has been stored successfully.' });
      }
    } catch (error: any) {
      toast({
        title: 'Unable to add memory',
        description: error?.message ?? 'Something went wrong while saving the memory item.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMemory = async (id: string) => {
    if (!agentId) return;
    try {
      await deleteMemoryItem(agentId, id);
      setMemoryItems((items) => items.filter((item) => item.id !== id));
      toast({ title: 'Memory removed', description: 'The memory item was deleted.' });
    } catch (error: any) {
      toast({
        title: 'Unable to remove memory',
        description: error?.message ?? 'Something went wrong while deleting the memory item.',
        variant: 'destructive',
      });
    }
  };

  const startEditing = (item: AgentMemory) => {
    setEditingId(item.id);
    setEditDraft({ key: item.key, value: item.value, type: item.type });
  };

  const handleUpdateMemory = async () => {
    if (!agentId || !editingId || !editDraft.key.trim() || !editDraft.value.trim()) return;
    setIsUpdating(true);
    try {
      const memory = await updateMemoryItem(agentId, editingId, {
        key: editDraft.key.trim(),
        value: editDraft.value.trim(),
        type: editDraft.type,
      });
      if (memory) {
        setMemoryItems((items) =>
          items.map((item) => (item.id === memory.id ? memory : item))
        );
        toast({ title: 'Memory updated', description: 'The memory item changes have been saved.' });
      }
      resetEditor();
    } catch (error: any) {
      toast({
        title: 'Unable to update memory',
        description: error?.message ?? 'Something went wrong while updating the memory item.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getTypeColor = useCallback((type: string) => {
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
  }, []);

  const memoryCount = useMemo(() => memoryItems.length, [memoryItems]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={cn('sm:max-w-2xl max-h-[80vh]', isMobile && 'max-w-[calc(100vw-1.5rem)] p-4')}>
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            Agent Memory Store
            <Badge variant="outline" className="text-xs">
              {memoryCount} items
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
                disabled={isSubmitting}
              />
              <select
                className="px-3 py-2 bg-input border border-border rounded-md text-sm"
                value={newItem.type}
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
              disabled={isSubmitting}
            />
            <Button
              onClick={handleAddMemory}
              size="sm"
              className="w-full bg-gradient-primary"
              disabled={isSubmitting}
            >
              <Plus className="h-4 w-4 mr-1" />
              {isSubmitting ? 'Saving...' : 'Add Memory'}
            </Button>
          </div>

          {/* Memory items list */}
          <ScrollArea className="h-96">
            <div className="space-y-3 pr-3">

                      </div>
                    </div>
                    {index < memoryItems.length - 1 && <Separator />}
                  </div>
                ))
              )}

              {!isLoading && memoryItems.length === 0 && (
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

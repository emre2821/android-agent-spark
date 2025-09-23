import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useAgents, type AgentMemory } from '@/hooks/use-agents';
import { useToast } from '@/hooks/use-toast';

interface AgentMemoryDialogProps {
  open: boolean;
  onClose: () => void;
  agentId: string;
}

type MemoryDraft = Pick<AgentMemory, 'key' | 'value' | 'type'>;



export const AgentMemoryDialog: React.FC<AgentMemoryDialogProps> = ({ open, onClose, agentId }) => {
  const { toast } = useToast();
  const {
    fetchAgentMemory,
    addMemoryItem,
    updateMemoryItem,
    deleteMemoryItem,
  } = useAgents();

  const [memoryItems, setMemoryItems] = useState<AgentMemory[]>([]);
  const [newItem, setNewItem] = useState<MemoryDraft>(createEmptyDraft());
  const [editDraft, setEditDraft] = useState<MemoryDraft>(createEmptyDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const resetEditor = useCallback(() => {
    setEditingId(null);
    setEditDraft(createEmptyDraft());
  }, []);

  const resetDrafts = useCallback(() => {
    setMemoryItems([]);

  }, [resetEditor]);

  useEffect(() => {
    if (!open) {
      resetDrafts();
      return;
    }

    let active = true;

    const loadMemory = async () => {
      if (!agentId) {
        setMemoryItems([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setMemoryItems([]);
      resetEditor();
      setNewItem(createEmptyDraft());

      try {
        const items = await fetchAgentMemory(agentId);
        if (!active) {
          return;
        }
        setMemoryItems(Array.isArray(items) ? items : []);
      } catch (error: any) {
        if (!active) {
          return;
        }
        setMemoryItems([]);
        toast({
          title: 'Unable to load memory',
          description: error?.message ?? 'Something went wrong while loading the agent memory.',
          variant: 'destructive',
        });
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadMemory();

    return () => {
      active = false;
    };
<

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
        setNewItem(createEmptyDraft());
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
      if (editingId === id) {
        resetEditor();
      }
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
        setMemoryItems((items) => items.map((item) => (item.id === memory.id ? memory : item)));
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

  const handleOpenChange = (value: boolean) => {
    if (!value) {
      resetDrafts();
      onClose();
    }
  };

  return (

      <DialogContent className="max-w-2xl">
        <div className="space-y-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              Agent Memory Store
              <Badge variant="outline" className="text-xs">
                {memoryCount} items
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="gradient-card p-4 rounded-lg border border-border/50 space-y-3">
              <h3 className="text-sm font-medium">Add Memory Item</h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Input
                  placeholder="Memory key (e.g., user_preference)"
                  value={newItem.key}
                  onChange={(e) => setNewItem({ ...newItem, key: e.target.value })}
                  disabled={isSubmitting}
                />
                <select
                  className="px-3 py-2 bg-input border border-border rounded-md text-sm"
                  value={newItem.type}
                  onChange={(e) => setNewItem({ ...newItem, type: e.target.value as MemoryDraft['type'] })}
                  disabled={isSubmitting}
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
              <Button onClick={handleAddMemory} disabled={isSubmitting}>
                <Plus className="h-4 w-4 mr-1" />
                {isSubmitting ? 'Saving...' : 'Add Memory'}
              </Button>
            </div>

            <div className="rounded-lg border border-border/50 bg-card/40">
              <ScrollArea className="h-[360px] pr-4">
                <div className="p-4 space-y-6">
                  {isLoading ? (
                    <p className="text-sm text-muted-foreground">Loading agent memory…</p>
                  ) : memoryItems.length > 0 ? (
                    memoryItems.map((item, index) => (
                      <div key={item.id} className="space-y-4">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-sm font-semibold text-foreground/90">{item.key}</h4>
                              <Badge variant="outline" className={getTypeColor(item.type)}>
                                {item.type}
                              </Badge>
                            </div>
                            {editingId === item.id ? (
                              <div className="space-y-3">
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                  <Input
                                    value={editDraft.key}
                                    onChange={(e) => setEditDraft({ ...editDraft, key: e.target.value })}
                                    disabled={isUpdating}
                                  />
                                  <select
                                    className="px-3 py-2 bg-input border border-border rounded-md text-sm"
                                    value={editDraft.type}
                                    onChange={(e) =>
                                      setEditDraft({ ...editDraft, type: e.target.value as MemoryDraft['type'] })
                                    }
                                    disabled={isUpdating}
                                  >
                                    <option value="fact">Fact</option>
                                    <option value="preference">Preference</option>
                                    <option value="skill">Skill</option>
                                    <option value="context">Context</option>
                                  </select>
                                </div>
                                <Textarea
                                  value={editDraft.value}
                                  onChange={(e) => setEditDraft({ ...editDraft, value: e.target.value })}
                                  rows={3}
                                  disabled={isUpdating}
                                />
                                <div className="flex flex-wrap gap-2">
                                  <Button onClick={handleUpdateMemory} disabled={isUpdating}>
                                    {isUpdating ? 'Saving...' : 'Save Changes'}
                                  </Button>
                                  <Button variant="outline" onClick={resetEditor} disabled={isUpdating}>
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.value}</p>
                            )}
                          </div>
                          {editingId !== item.id && (
                            <div className="flex items-center gap-2 self-start">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => startEditing(item)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleDeleteMemory(item.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                        {index < memoryItems.length - 1 && <Separator />}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 text-sm">
                      <p className="text-muted-foreground">No memory items yet.</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Add your first memory item above to get started.
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

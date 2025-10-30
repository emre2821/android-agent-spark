import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useAgents } from '@/hooks/use-agents';
import { useToast } from '@/hooks/use-toast';
import type { MemoryItem, MemoryType } from '@/types/memory';

interface AgentMemoryDialogProps {
  open: boolean;
  onClose: () => void;
  agentId: string;
}

type MemoryDraft = Pick<MemoryItem, 'key' | 'value' | 'type'>;

const createEmptyDraft = (): MemoryDraft => ({ key: '', value: '', type: 'fact' });

const typeClasses: Record<MemoryType, string> = {
  fact: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  preference: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  skill: 'bg-green-500/20 text-green-400 border-green-500/30',
  context: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

export const AgentMemoryDialog: React.FC<AgentMemoryDialogProps> = ({ open, onClose, agentId }) => {
  const { fetchAgentMemory, addMemoryItem, updateMemoryItem, deleteMemoryItem } = useAgents();
  const { toast } = useToast();

  const [memoryItems, setMemoryItems] = useState<MemoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [newItem, setNewItem] = useState<MemoryDraft>(createEmptyDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<MemoryDraft>(createEmptyDraft());

  const resetState = useCallback(() => {
    setMemoryItems([]);
    setIsLoading(false);
    setIsSubmitting(false);
    setIsUpdating(false);
    setDeletingId(null);
    setNewItem(createEmptyDraft());
    setEditingId(null);
    setEditDraft(createEmptyDraft());
  }, []);

  useEffect(() => {
    if (!open) {
      resetState();
      return;
    }

    let cancelled = false;

    const loadMemory = async () => {
      if (!agentId) {
        setMemoryItems([]);
        return;
      }

      setIsLoading(true);
      try {
        const items = await fetchAgentMemory(agentId);
        if (!cancelled) {
          setMemoryItems(Array.isArray(items) ? items : []);
        }
      } catch (error) {
        if (!cancelled) {
          setMemoryItems([]);
          const message = error instanceof Error ? error.message : 'Something went wrong while loading memory items.';
          toast({
            title: 'Unable to load memory',
            description: message,
            variant: 'destructive',
          });
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadMemory();

    return () => {
      cancelled = true;
    };
  }, [agentId, fetchAgentMemory, open, resetState, toast]);

  useEffect(() => {
    if (!editingId) {
      return;
    }

    const item = memoryItems.find((memory) => memory.id === editingId);
    if (!item) {
      setEditingId(null);
      setEditDraft(createEmptyDraft());
      return;
    }

    setEditDraft({ key: item.key, value: item.value, type: item.type });
  }, [editingId, memoryItems]);

  const handleDialogChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        resetState();
        onClose();
      }
    },
    [onClose, resetState],
  );

  const handleAddMemory = async () => {
    if (!agentId || !newItem.key.trim() || !newItem.value.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await addMemoryItem(agentId, {
        key: newItem.key.trim(),
        value: newItem.value.trim(),
        type: newItem.type,
      });
      setMemoryItems((items) => [created, ...items]);
      setNewItem(createEmptyDraft());
      toast({
        title: 'Memory added',
        description: 'The memory item has been stored successfully.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add memory';
      toast({ title: 'Unable to add memory', description: message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEditing = (item: MemoryItem) => {
    setEditingId(item.id);
    setEditDraft({ key: item.key, value: item.value, type: item.type });
  };

  const handleUpdateMemory = async () => {
    if (!agentId || !editingId) {
      return;
    }

    if (!editDraft.key.trim() || !editDraft.value.trim()) {
      toast({
        title: 'Incomplete memory item',
        description: 'Please provide both a key and value before saving.',
        variant: 'destructive',
      });
      return;
    }

    setIsUpdating(true);
    try {
      const updated = await updateMemoryItem(agentId, editingId, {
        key: editDraft.key.trim(),
        value: editDraft.value.trim(),
        type: editDraft.type,
      });
      setMemoryItems((items) => items.map((item) => (item.id === updated.id ? updated : item)));
      setEditingId(null);
      setEditDraft(createEmptyDraft());
      toast({
        title: 'Memory updated',
        description: 'The memory item changes have been saved.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update memory';
      toast({ title: 'Unable to update memory', description: message, variant: 'destructive' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditDraft(createEmptyDraft());
  };

  const handleDeleteMemory = async (id: string) => {
    if (!agentId) {
      return;
    }

    setDeletingId(id);
    try {
      await deleteMemoryItem(agentId, id);
      setMemoryItems((items) => items.filter((item) => item.id !== id));
      toast({
        title: 'Memory removed',
        description: 'The memory item has been deleted.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete memory';
      toast({ title: 'Unable to delete memory', description: message, variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  const memoryCount = useMemo(() => memoryItems.length, [memoryItems]);

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh]">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input
                placeholder="Memory key (e.g., user_preference)"
                value={newItem.key}
                onChange={(event) => setNewItem({ ...newItem, key: event.target.value })}
                disabled={isSubmitting}
              />
              <select
                className="px-3 py-2 bg-input border border-border rounded-md text-sm"
                value={newItem.type}
                onChange={(event) => setNewItem({ ...newItem, type: event.target.value as MemoryType })}
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
              onChange={(event) => setNewItem({ ...newItem, value: event.target.value })}
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
                    <div key={item.id} className="space-y-4" data-testid={`memory-item-${index}`}>
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-sm font-semibold text-foreground/90">{item.key}</h4>
                            <Badge variant="outline" className={typeClasses[item.type] ?? 'bg-muted text-muted-foreground'}>
                              {item.type}
                            </Badge>
                          </div>
                          {editingId === item.id ? (
                            <div className="space-y-3">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <Input
                                  value={editDraft.key}
                                  onChange={(event) => setEditDraft({ ...editDraft, key: event.target.value })}
                                  disabled={isUpdating}
                                />
                                <select
                                  className="px-3 py-2 bg-input border border-border rounded-md text-sm"
                                  value={editDraft.type}
                                  onChange={(event) => setEditDraft({ ...editDraft, type: event.target.value as MemoryType })}
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
                                onChange={(event) => setEditDraft({ ...editDraft, value: event.target.value })}
                                rows={3}
                                disabled={isUpdating}
                              />
                              <div className="flex flex-wrap gap-2">
                                <Button onClick={handleUpdateMemory} disabled={isUpdating}>
                                  {isUpdating ? 'Saving...' : 'Save Changes'}
                                </Button>
                                <Button variant="outline" onClick={handleCancelEdit} disabled={isUpdating}>
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
                              onClick={() => handleStartEditing(item)}
                              aria-label={`Edit memory ${item.key}`}
                              data-testid={`edit-memory-${index}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleDeleteMemory(item.id)}
                              disabled={deletingId === item.id}
                              aria-label={`Delete memory ${item.key}`}
                              data-testid={`delete-memory-${index}`}
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
      </DialogContent>
    </Dialog>
  );
};


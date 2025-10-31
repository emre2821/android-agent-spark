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

interface AgentMemory {
  id: string;
  key: string;
  value: string;
  type: 'fact' | 'preference' | 'skill' | 'context';
  createdAt?: string;
  updatedAt?: string;
}

interface AgentMemoryDialogProps {
  open: boolean;
  onClose: () => void;
  agentId: string;
}

type MemoryDraft = Pick<MemoryItem, 'key' | 'value' | 'type'>;

const createEmptyDraft = (): MemoryDraft => ({ key: '', value: '', type: 'fact' });

const typeClasses: Record<MemoryType, string> = {
type MemoryDraft = Pick<AgentMemory, 'key' | 'value' | 'type'>;

const EMPTY_DRAFT: MemoryDraft = { key: '', value: '', type: 'fact' };

type MemoryActions = Pick<
  ReturnType<typeof useAgents>,
  'fetchAgentMemory' | 'addMemoryItem' | 'updateMemoryItem' | 'deleteMemoryItem'
>;

const TYPE_COLORS: Record<MemoryDraft['type'], string> = {
  fact: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  preference: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  skill: 'bg-green-500/20 text-green-400 border-green-500/30',
  context: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

export const AgentMemoryDialog: React.FC<AgentMemoryDialogProps> = ({ open, onClose, agentId }) => {
  const { fetchAgentMemory, addMemoryItem, updateMemoryItem, deleteMemoryItem } = useAgents();
  const { toast } = useToast();

  const [memoryItems, setMemoryItems] = useState<MemoryItem[]>([]);
  const { toast } = useToast();
  const { fetchAgentMemory, addMemoryItem, updateMemoryItem, deleteMemoryItem } = useAgents() as MemoryActions;

  const [memoryItems, setMemoryItems] = useState<AgentMemory[]>([]);
  const [newItem, setNewItem] = useState<MemoryDraft>(EMPTY_DRAFT);
  const [editDraft, setEditDraft] = useState<MemoryDraft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
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
  const resetEditor = useCallback(() => {
    setEditingId(null);
    setEditDraft(EMPTY_DRAFT);
  }, []);

  const resetState = useCallback(() => {
    setMemoryItems([]);
    setNewItem(EMPTY_DRAFT);
    setIsLoading(false);
    setIsSubmitting(false);
    setIsUpdating(false);
    resetEditor();
  }, [resetEditor]);

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
      resetEditor();
      setNewItem(EMPTY_DRAFT);

      try {
        const items = fetchAgentMemory ? await fetchAgentMemory(agentId) : [];
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
          toast({
            title: 'Unable to load memory',
            description: error instanceof Error ? error.message : 'Something went wrong while loading memory.',
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
  }, [agentId, open, fetchAgentMemory, resetEditor, resetState, toast]);

  const handleAddMemory = async () => {
    if (!agentId || !addMemoryItem) {
      toast({ title: 'Unable to add memory', description: 'Memory service is unavailable.', variant: 'destructive' });
      return;
    }
    if (!newItem.key.trim() || !newItem.value.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await addMemoryItem(agentId, {
      const saved = await addMemoryItem(agentId, {
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
      setMemoryItems((items) => [saved, ...items]);
      setNewItem(EMPTY_DRAFT);
      toast({ title: 'Memory added', description: 'The memory item has been stored.' });
    } catch (error) {
      toast({
        title: 'Unable to add memory',
        description: error instanceof Error ? error.message : 'Something went wrong while saving the memory item.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEditing = (item: MemoryItem) => {
  const handleDeleteMemory = async (id: string) => {
    if (!agentId || !deleteMemoryItem) {
      toast({ title: 'Unable to remove memory', description: 'Memory service is unavailable.', variant: 'destructive' });
      return;
    }

    try {
      await deleteMemoryItem(agentId, id);
      setMemoryItems((items) => items.filter((item) => item.id !== id));
      if (editingId === id) {
        resetEditor();
      }
      toast({ title: 'Memory removed', description: 'The memory item was deleted.' });
    } catch (error) {
      toast({
        title: 'Unable to remove memory',
        description: error instanceof Error ? error.message : 'Something went wrong while deleting the memory item.',
        variant: 'destructive',
      });
    }
  };

  const startEditing = (item: AgentMemory) => {
    setEditingId(item.id);
    setEditDraft({ key: item.key, value: item.value, type: item.type });
  };

  const handleUpdateMemory = async () => {
    if (!agentId || !editingId) {
      return;
    }

    if (!agentId || !editingId || !updateMemoryItem) {
      toast({ title: 'Unable to update memory', description: 'Memory service is unavailable.', variant: 'destructive' });
      return;
    }
    if (!editDraft.key.trim() || !editDraft.value.trim()) {
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
      toast({ title: 'Memory updated', description: 'Changes have been saved.' });
      resetEditor();
    } catch (error) {
      toast({
        title: 'Unable to update memory',
        description: error instanceof Error ? error.message : 'Something went wrong while updating the memory item.',
        variant: 'destructive',
      });
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
  const memoryCount = useMemo(() => memoryItems.length, [memoryItems]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetState();
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <div className="space-y-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
              Agent Memory Store
              <Badge variant="outline" className="text-xs">
                {memoryCount} items
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="rounded-lg border border-border/50 bg-card/40 p-4 space-y-3">
              <h3 className="text-sm font-medium">Add Memory Item</h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Input
                  placeholder="Memory key (e.g., user_preference)"
                  value={newItem.key}
                  onChange={(event) => setNewItem((state) => ({ ...state, key: event.target.value }))}
                  disabled={isSubmitting}
                />
                <select
                  className="rounded-md border border-border bg-input px-3 py-2 text-sm"
                  value={newItem.type}
                  onChange={(event) => setNewItem((state) => ({ ...state, type: event.target.value as MemoryDraft['type'] }))}
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
                onChange={(event) => setNewItem((state) => ({ ...state, value: event.target.value }))}
                rows={2}
                disabled={isSubmitting}
              />
              <Button onClick={handleAddMemory} disabled={isSubmitting}>
                <Plus className="mr-1 h-4 w-4" />
                {isSubmitting ? 'Saving…' : 'Add Memory'}
              </Button>
            </div>

            <div className="rounded-lg border border-border/50 bg-card/40">
              <ScrollArea className="h-[360px] pr-4">
                <div className="space-y-6 p-4">
                  {isLoading ? (
                    <p className="text-sm text-muted-foreground">Loading agent memory…</p>
                  ) : memoryItems.length > 0 ? (
                    memoryItems.map((item, index) => (
                      <div key={item.id} className="space-y-4">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex-1 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-sm font-semibold text-foreground/90">{item.key}</h4>
                              <Badge variant="outline" className={TYPE_COLORS[item.type]}>
                                {item.type}
                              </Badge>
                            </div>
                            {editingId === item.id ? (
                              <div className="space-y-3">
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                  <Input
                                    value={editDraft.key}
                                    onChange={(event) => setEditDraft((state) => ({ ...state, key: event.target.value }))}
                                    disabled={isUpdating}
                                  />
                                  <select
                                    className="rounded-md border border-border bg-input px-3 py-2 text-sm"
                                    value={editDraft.type}
                                    onChange={(event) =>
                                      setEditDraft((state) => ({
                                        ...state,
                                        type: event.target.value as MemoryDraft['type'],
                                      }))
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
                                  onChange={(event) => setEditDraft((state) => ({ ...state, value: event.target.value }))}
                                  rows={3}
                                  disabled={isUpdating}
                                />
                                <div className="flex flex-wrap gap-2">
                                  <Button onClick={handleUpdateMemory} disabled={isUpdating}>
                                    {isUpdating ? 'Saving…' : 'Save Changes'}
                                  </Button>
                                  <Button variant="outline" onClick={resetEditor} disabled={isUpdating}>
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{item.value}</p>
                            )}
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
                    ))
                  ) : (
                    <div className="py-10 text-center text-sm text-muted-foreground">
                      <p>No memory items yet.</p>
                      <p className="mt-1 text-xs">Add your first memory item above to get started.</p>
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


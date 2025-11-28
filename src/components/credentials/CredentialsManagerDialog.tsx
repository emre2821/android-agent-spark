import { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { CredentialForm, CredentialFormValues } from './CredentialForm';
import { CredentialTable } from './CredentialTable';
import { useCredentials } from '@/hooks/use-credentials';
import { useToast } from '@/hooks/use-toast';

interface CredentialsManagerDialogProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  workspaceId: string;
}

export const CredentialsManagerDialog: React.FC<CredentialsManagerDialogProps> = ({
  open,
  onClose,
  userId,
  workspaceId,
}) => {
  const { toast } = useToast();
  const { list, create, destroy } = useCredentials(workspaceId);

  useEffect(() => {
    if (!open) {
      return;
    }
    list.refetch();
  }, [open, list]);

  const handleSubmit = async (values: CredentialFormValues) => {
    try {
      const secret = (() => {
        try {
          return JSON.parse(values.secret);
        } catch {
          return values.secret;
        }
      })();

      await create.mutateAsync({
        userId,
        workspaceId,
        name: values.name,
        type: values.type,
        scopes: values.scopes?.split(',').map(scope => scope.trim()).filter(Boolean),
        secret,
      });

      toast({
        title: 'Credential saved',
        description: `${values.name} is now available for workflow nodes.`,
      });
    } catch (error) {
      toast({
        title: 'Unable to save credential',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (credentialId: string, credentialName: string) => {
    try {
      await destroy.mutateAsync({ id: credentialId });
      toast({
        title: 'Credential removed',
        description: `${credentialName} has been deleted for this workspace.`,
      });
    } catch (error) {
      toast({
        title: 'Unable to delete credential',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Secure Credentials</DialogTitle>
          <DialogDescription>
            Credentials are encrypted and scoped to your workspace. Attach them to workflow nodes without revealing secrets in the UI.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="list" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="list">Stored Credentials</TabsTrigger>
            <TabsTrigger value="new">Add Credential</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-4 space-y-4">
            <ScrollArea className="h-[320px] pr-4">
              <CredentialTable
                credentials={list.data}
                isLoading={list.isLoading || list.isFetching}
                onDelete={(credential) => handleDelete(credential.id, credential.name)}
              />
            </ScrollArea>
          </TabsContent>

          <TabsContent value="new" className="mt-4">
            <div className="grid gap-4">
              <CredentialForm isSubmitting={create.isPending} onSubmit={handleSubmit} />
              <Separator />
              <div className="rounded-md border border-dashed border-muted p-4 text-sm text-muted-foreground">
                Encrypted credentials never leave the server unprotected. Provide JSON for complex providers (like OAuth) or raw tokens for simple use cases. Scopes help document intent for collaborators.
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};


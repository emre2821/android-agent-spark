import { CredentialMetadata } from '@/types/credential';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface CredentialTableProps {
  credentials: CredentialMetadata[] | undefined;
  isLoading: boolean;
  onDelete: (credential: CredentialMetadata) => void;
}

export const CredentialTable: React.FC<CredentialTableProps> = ({ credentials, isLoading, onDelete }) => {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (!credentials?.length) {
    return (
      <div className="rounded-md border border-dashed border-muted p-6 text-center text-sm text-muted-foreground">
        No credentials have been saved for this workspace yet.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Scopes</TableHead>
          <TableHead>Last Used</TableHead>
          <TableHead className="w-[120px] text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {credentials.map((credential) => (
          <TableRow key={credential.id}>
            <TableCell>
              <div className="font-medium">{credential.name}</div>
              <div className="text-xs text-muted-foreground">Created {new Date(credential.createdAt).toLocaleString()}</div>
            </TableCell>
            <TableCell className="capitalize">{credential.type.replace('-', ' ')}</TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {credential.scopes.length === 0 && (
                  <span className="text-xs text-muted-foreground">No scopes</span>
                )}
                {credential.scopes.map((scope) => (
                  <Badge key={scope} variant="outline" className="text-xs">
                    {scope}
                  </Badge>
                ))}
              </div>
            </TableCell>
            <TableCell>
              {credential.lastUsedAt ? new Date(credential.lastUsedAt).toLocaleString() : 'Never'}
            </TableCell>
            <TableCell className="text-right">
              <Button variant="ghost" size="sm" onClick={() => onDelete(credential)}>
                Remove
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};


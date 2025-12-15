import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['api-key', 'oauth', 'basic-auth', 'custom']),
  secret: z.string().min(1, 'Secret payload is required'),
  scopes: z.string().optional(),
});

export interface CredentialFormValues extends z.infer<typeof formSchema> {}

interface CredentialFormProps {
  isSubmitting: boolean;
  onSubmit: (values: CredentialFormValues) => Promise<void> | void;
}

export const CredentialForm: React.FC<CredentialFormProps> = ({ isSubmitting, onSubmit }) => {
  const [pendingScope, setPendingScope] = useState('');
  const form = useForm<CredentialFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      type: 'api-key',
      secret: '',
      scopes: '',
    },
  });

  const addScope = () => {
    if (!pendingScope.trim()) {
      return;
    }
    const current = form.getValues('scopes');
    const scopes = current ? current.split(',').map(scope => scope.trim()).filter(Boolean) : [];
    if (!scopes.includes(pendingScope.trim())) {
      scopes.push(pendingScope.trim());
    }
    form.setValue('scopes', scopes.join(', '));
    setPendingScope('');
  };

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values);
    form.reset({ name: '', type: values.type, secret: '', scopes: '' });
  });

  const scopes = form.watch('scopes')
    ?.split(',')
    .map(scope => scope.trim())
    .filter(Boolean) ?? [];

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Credential Name</FormLabel>
              <FormControl>
                <Input placeholder="Production API Token" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Credential Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select credential type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="api-key">API Key</SelectItem>
                  <SelectItem value="oauth">OAuth Token</SelectItem>
                  <SelectItem value="basic-auth">Basic Auth</SelectItem>
                  <SelectItem value="custom">Custom JSON</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="secret"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Secret Payload</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  rows={4}
                  placeholder='{"token":"sk-..."}'
                  className="font-mono"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div>
          <FormLabel>Scopes</FormLabel>
          <div className="flex gap-2 mt-2">
            <Input
              value={pendingScope}
              onChange={(event) => setPendingScope(event.target.value)}
              placeholder="Add scope (press Add)"
            />
            <Button type="button" variant="secondary" onClick={addScope}>
              Add
            </Button>
          </div>
          {scopes.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {scopes.map(scope => (
                <Badge key={scope} variant="secondary">
                  {scope}
                </Badge>
              ))}
            </div>
          )}
          <FormField
            control={form.control}
            name="scopes"
            render={({ field }) => (
              <input type="hidden" {...field} />
            )}
          />
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save Credential'}
          </Button>
        </div>
      </form>
    </Form>
  );
};


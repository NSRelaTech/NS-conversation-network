import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const createGroupSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string().optional(),
  privacy: z.enum(['public', 'private']),
});

type CreateGroupForm = z.infer<typeof createGroupSchema>;

export function CreateGroupPage() {
  const navigate = useNavigate();

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<CreateGroupForm>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: { privacy: 'public' },
  });

  const create = useMutation({
    mutationFn: (data: CreateGroupForm) =>
      api<any>('/groups', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (data) => {
      navigate(`/groups/${data.id}`);
    },
  });

  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>Create a group</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((d) => create.mutate(d))} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" {...register('description')} rows={3} className="resize-none" />
            </div>
            <div className="space-y-2">
              <Label>Privacy</Label>
              <Select defaultValue="public" onValueChange={(v) => setValue('privacy', v as 'public' | 'private')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {create.error && (
              <p className="text-sm text-red-500">{create.error.message}</p>
            )}
            <Button type="submit" className="w-full" disabled={create.isPending}>
              {create.isPending ? 'Creating...' : 'Create group'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const editProfileSchema = z.object({
  displayName: z.string().max(100).optional(),
  bio: z.string().max(500).optional(),
  location: z.string().max(100).optional(),
  website: z.string().url('Invalid URL').max(200).optional().or(z.literal('')),
});

type EditProfileForm = z.infer<typeof editProfileSchema>;

export function EditProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  const { data: profileResult } = useQuery({
    queryKey: ['profile', userId],
    queryFn: () => api<any>(`/profiles/me`),
    enabled: !!userId,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<EditProfileForm>({
    resolver: zodResolver(editProfileSchema),
  });

  useEffect(() => {
    if (profileResult?.data) {
      const p = profileResult.data;
      reset({
        displayName: p.displayName || '',
        bio: p.bio || '',
        location: p.location || '',
        website: p.website || '',
      });
    }
  }, [profileResult, reset]);

  const update = useMutation({
    mutationFn: (data: EditProfileForm) =>
      api<any>(`/profiles/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...data,
          website: data.website || null,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
      navigate(`/users/${userId}`);
    },
  });

  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>Edit profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((d) => update.mutate(d))} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display name</Label>
              <Input id="displayName" {...register('displayName')} />
              {errors.displayName && <p className="text-sm text-red-500">{errors.displayName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" {...register('bio')} rows={3} className="resize-none" />
              {errors.bio && <p className="text-sm text-red-500">{errors.bio.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" {...register('location')} />
              {errors.location && <p className="text-sm text-red-500">{errors.location.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input id="website" type="url" placeholder="https://" {...register('website')} />
              {errors.website && <p className="text-sm text-red-500">{errors.website.message}</p>}
            </div>
            {update.error && (
              <p className="text-sm text-red-500">{update.error.message}</p>
            )}
            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={update.isPending}>
                {update.isPending ? 'Saving...' : 'Save'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

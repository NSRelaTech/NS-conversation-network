import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

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
  const username = useAuthStore((s) => s.user?.username);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

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
      if (p.avatarUrl) setAvatarPreview(p.avatarUrl);
    }
  }, [profileResult, reset]);

  const uploadAvatar = useMutation({
    mutationFn: async (file: File) => {
      const token = useAuthStore.getState().accessToken;
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await fetch(`${API_BASE}/profiles/me/avatar`, {
        method: 'POST',
        headers: { ...(token && { Authorization: `Bearer ${token}` }) },
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      return res.json();
    },
    onSuccess: (data) => {
      if (data?.data?.avatarUrl) setAvatarPreview(data.data.avatarUrl);
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('File too large. Max 5MB.');
      return;
    }
    uploadAvatar.mutate(file);
  };

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

  const initials = (username || '??').slice(0, 2).toUpperCase();

  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>Edit profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-2 mb-6">
            <div className="relative">
              <Avatar className="h-20 w-20">
                <AvatarImage src={avatarPreview || undefined} />
                <AvatarFallback className="bg-stone-200 text-stone-600 text-lg">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 rounded-full bg-stone-900 p-1.5 text-white hover:bg-stone-700 transition-colors"
                disabled={uploadAvatar.isPending}
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            {uploadAvatar.isPending && (
              <p className="text-xs text-stone-400">Uploading...</p>
            )}
            {uploadAvatar.error && (
              <p className="text-xs text-red-500">Upload failed</p>
            )}
          </div>

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

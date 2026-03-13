import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function ChangeUsernamePage() {
  const navigate = useNavigate();
  const { user, setAuth } = useAuthStore();
  const [username, setUsername] = useState(user?.username || '');

  const mutation = useMutation({
    mutationFn: () =>
      api<any>('/auth/change-username', {
        method: 'POST',
        body: JSON.stringify({ username }),
      }),
    onSuccess: (data) => {
      if (data?.user) {
        const tokens = { accessToken: useAuthStore.getState().accessToken!, refreshToken: useAuthStore.getState().refreshToken! };
        setAuth(tokens, data.user);
      }
      navigate('/settings');
    },
  });

  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>Change username</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">New username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                minLength={3}
                maxLength={50}
                required
              />
            </div>
            {mutation.error && (
              <p className="text-sm text-red-500">{mutation.error.message}</p>
            )}
            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={mutation.isPending || username === user?.username}>
                {mutation.isPending ? 'Saving...' : 'Save'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/settings')}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

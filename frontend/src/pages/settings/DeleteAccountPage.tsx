import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export function DeleteAccountPage() {
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      api<any>('/auth/delete-account', {
        method: 'POST',
        body: JSON.stringify({ password }),
      }),
    onSuccess: () => {
      logout();
      navigate('/auth/login');
    },
  });

  const confirmed = confirmation === 'DELETE';

  return (
    <div className="mx-auto max-w-lg">
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Delete account</CardTitle>
          <CardDescription>
            This action is permanent and cannot be undone. All your posts, comments, and data will be deleted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); if (confirmed) mutation.mutate(); }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Your password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmation">Type DELETE to confirm</Label>
              <Input id="confirmation" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} placeholder="DELETE" required />
            </div>
            {mutation.error && (
              <p className="text-sm text-red-500">{mutation.error.message}</p>
            )}
            <div className="flex gap-2">
              <Button type="submit" variant="destructive" className="flex-1" disabled={mutation.isPending || !confirmed}>
                {mutation.isPending ? 'Deleting...' : 'Delete my account'}
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

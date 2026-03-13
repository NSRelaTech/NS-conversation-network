import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';

interface FollowButtonProps {
  userId: string;
  isFollowing: boolean;
}

export function FollowButton({ userId, isFollowing }: FollowButtonProps) {
  const queryClient = useQueryClient();

  const follow = useMutation({
    mutationFn: () =>
      api<any>(`/social/follow/${userId}`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
    },
  });

  const unfollow = useMutation({
    mutationFn: () =>
      api<any>(`/social/unfollow/${userId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
    },
  });

  const isPending = follow.isPending || unfollow.isPending;

  if (isFollowing) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => unfollow.mutate()}
        disabled={isPending}
      >
        Following
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      onClick={() => follow.mutate()}
      disabled={isPending}
    >
      Follow
    </Button>
  );
}

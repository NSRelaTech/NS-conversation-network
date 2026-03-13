import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';

interface JoinLeaveButtonProps {
  groupId: string;
  isMember: boolean;
}

export function JoinLeaveButton({ groupId, isMember }: JoinLeaveButtonProps) {
  const queryClient = useQueryClient();

  const join = useMutation({
    mutationFn: () =>
      api<any>(`/groups/${groupId}/members`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
    },
  });

  const leave = useMutation({
    mutationFn: () =>
      api<any>(`/groups/${groupId}/members/me`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
    },
  });

  if (isMember) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => leave.mutate()}
        disabled={leave.isPending}
      >
        {leave.isPending ? 'Leaving...' : 'Leave'}
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      onClick={() => join.mutate()}
      disabled={join.isPending}
    >
      {join.isPending ? 'Joining...' : 'Join'}
    </Button>
  );
}

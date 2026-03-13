import { Link } from 'react-router-dom';
import { MapPin, LinkIcon } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { FollowButton } from '@/components/social/FollowButton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { buttonVariants } from '@/components/ui/button';

interface Profile {
  userId: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  location: string | null;
  website: string | null;
  followersCount?: number;
  followingCount?: number;
  isFollowing?: boolean;
}

export function ProfileHeader({ profile }: { profile: Profile }) {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const isOwnProfile = currentUserId === profile.userId;

  const displayName = profile.displayName || 'User';
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="rounded-lg border bg-white p-6">
      <div className="flex items-start gap-4">
        <Avatar className="h-16 w-16">
          {profile.avatarUrl && <AvatarImage src={profile.avatarUrl} />}
          <AvatarFallback className="bg-amber-100 text-amber-700 text-lg">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h1 className="text-xl font-semibold text-stone-900">{displayName}</h1>
            </div>
            {isOwnProfile ? (
              <Link to="/settings/profile" className={buttonVariants({ variant: "outline", size: "sm" })}>
                Edit
              </Link>
            ) : (
              <FollowButton userId={profile.userId} isFollowing={profile.isFollowing ?? false} />
            )}
          </div>

          {profile.bio && (
            <p className="mt-2 text-stone-600">{profile.bio}</p>
          )}

          <div className="mt-3 flex flex-wrap gap-4 text-sm text-stone-400">
            {profile.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {profile.location}
              </span>
            )}
            {profile.website && (
              <a
                href={profile.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-stone-600 hover:underline"
              >
                <LinkIcon className="h-3.5 w-3.5" />
                {new URL(profile.website).hostname}
              </a>
            )}
          </div>

          <div className="mt-3 flex gap-4 text-sm">
            <span>
              <strong className="text-stone-900">{profile.followersCount ?? 0}</strong>{' '}
              <span className="text-stone-400">followers</span>
            </span>
            <span>
              <strong className="text-stone-900">{profile.followingCount ?? 0}</strong>{' '}
              <span className="text-stone-400">following</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

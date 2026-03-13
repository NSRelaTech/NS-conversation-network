import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { Home, Users, Settings, Github } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button, buttonVariants } from '@/components/ui/button';

export function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/auth/login');
  };

  const { data: profileResult } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => api<any>(`/profiles/me`),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
  const avatarUrl = profileResult?.data?.avatarUrl;
  const initials = user?.username?.slice(0, 2).toUpperCase() || '??';

  const tabs = [
    { path: '/', icon: Home, label: 'Feed' },
    { path: '/groups', icon: Users, label: 'Groups' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="min-h-screen bg-stone-50 pb-16 lg:pb-0">
      {/* Desktop top nav */}
      <nav className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur hidden lg:block">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link to="/" className="text-lg font-semibold text-stone-900">
              Community
            </Link>
            <div className="flex gap-1">
              <Link to="/" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                Feed
              </Link>
              <Link to="/groups" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                Groups
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  {avatarUrl && <AvatarImage src={avatarUrl} />}
                  <AvatarFallback className="bg-stone-200 text-stone-600 text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a
                  href="https://github.com/NSRelaTech/NS-conversation-network"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <Github className="h-4 w-4" />
                  GitHub
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </div>
      </nav>

      {/* Mobile top bar — logo + avatar only */}
      <nav className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur lg:hidden">
        <div className="flex h-12 items-center justify-between px-4">
          <Link to="/" className="text-lg font-semibold text-stone-900">
            Community
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full h-8 w-8">
                <Avatar className="h-7 w-7">
                  {avatarUrl && <AvatarImage src={avatarUrl} />}
                  <AvatarFallback className="bg-stone-200 text-stone-600 text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a
                  href="https://github.com/NSRelaTech/NS-conversation-network"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <Github className="h-4 w-4" />
                  GitHub
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>

      {/* Content */}
      <main className="mx-auto max-w-5xl px-4 py-4 lg:py-6">
        <Outlet />
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white lg:hidden">
        <div className="flex h-14 items-center justify-around">
          {tabs.map(({ path, icon: Icon, label }) => {
            const isActive = path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(path);
            return (
              <Link
                key={path}
                to={path}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 ${
                  isActive ? 'text-stone-900' : 'text-stone-400'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

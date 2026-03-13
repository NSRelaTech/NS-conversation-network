import { Link } from 'react-router-dom';
import { User, Lock, LogOut } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function SettingsPage() {
  const { logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/auth/login');
  };

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-xl font-semibold text-stone-900">Settings</h1>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <Link
            to="/settings/profile"
            className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-stone-50 transition-colors"
          >
            <User className="h-4 w-4 text-stone-500" />
            <div>
              <p className="text-sm font-medium text-stone-900">Edit profile</p>
              <p className="text-xs text-stone-400">Name, bio, location, website, avatar</p>
            </div>
          </Link>
          <Link
            to="/settings/privacy"
            className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-stone-50 transition-colors"
          >
            <Lock className="h-4 w-4 text-stone-500" />
            <div>
              <p className="text-sm font-medium text-stone-900">Privacy</p>
              <p className="text-xs text-stone-400">Profile visibility</p>
            </div>
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 hover:bg-red-50 transition-colors text-red-600"
          >
            <LogOut className="h-4 w-4" />
            <span className="text-sm font-medium">Log out</span>
          </button>
        </CardContent>
      </Card>
    </div>
  );
}

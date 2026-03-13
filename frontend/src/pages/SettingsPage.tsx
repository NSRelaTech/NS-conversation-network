import { Link } from 'react-router-dom';
import { User, KeyRound, Mail, AtSign, Trash2, LogOut } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function SettingsPage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/auth/login');
  };

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-xl font-semibold text-stone-900">Settings</h1>

      <Card>
        <CardContent className="pt-6">
          <Link
            to={`/users/${user?.id}`}
            className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-stone-50 transition-colors"
          >
            <User className="h-4 w-4 text-stone-500" />
            <div>
              <p className="text-sm font-medium text-stone-900">View profile</p>
              <p className="text-xs text-stone-400">See how others see you</p>
            </div>
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <Link
            to="/settings/username"
            className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-stone-50 transition-colors"
          >
            <AtSign className="h-4 w-4 text-stone-500" />
            <div>
              <p className="text-sm font-medium text-stone-900">Change username</p>
              <p className="text-xs text-stone-400">Currently: {user?.username}</p>
            </div>
          </Link>
          <Link
            to="/settings/email"
            className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-stone-50 transition-colors"
          >
            <Mail className="h-4 w-4 text-stone-500" />
            <div>
              <p className="text-sm font-medium text-stone-900">Change email</p>
              <p className="text-xs text-stone-400">Update your email address</p>
            </div>
          </Link>
          <Link
            to="/settings/password"
            className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-stone-50 transition-colors"
          >
            <KeyRound className="h-4 w-4 text-stone-500" />
            <div>
              <p className="text-sm font-medium text-stone-900">Change password</p>
              <p className="text-xs text-stone-400">Update your password</p>
            </div>
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-1">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 hover:bg-red-50 transition-colors text-red-600"
          >
            <LogOut className="h-4 w-4" />
            <span className="text-sm font-medium">Log out</span>
          </button>
          <Link
            to="/settings/delete-account"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 hover:bg-red-50 transition-colors text-red-600"
          >
            <Trash2 className="h-4 w-4" />
            <span className="text-sm font-medium">Delete account</span>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

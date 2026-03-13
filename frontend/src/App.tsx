import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { useAuthStore } from '@/stores/auth';
import { Layout } from '@/pages/Layout';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { VerifyEmailPage } from '@/pages/auth/VerifyEmailPage';
import { FeedPage } from '@/pages/FeedPage';
import { GroupsPage } from '@/pages/groups/GroupsPage';
import { GroupDetailPage } from '@/pages/groups/GroupDetailPage';
import { CreateGroupPage } from '@/pages/groups/CreateGroupPage';
import { ProfilePage } from '@/pages/profiles/ProfilePage';
import { EditProfilePage } from '@/pages/profiles/EditProfilePage';
import { SettingsPage } from '@/pages/SettingsPage';
import { ChangeUsernamePage } from '@/pages/settings/ChangeUsernamePage';
import { ChangeEmailPage } from '@/pages/settings/ChangeEmailPage';
import { ChangePasswordPage } from '@/pages/settings/ChangePasswordPage';
import { DeleteAccountPage } from '@/pages/settings/DeleteAccountPage';

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/auth/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Auth — no layout */}
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/register" element={<RegisterPage />} />
          <Route path="/auth/verify-email/:token" element={<VerifyEmailPage />} />

          {/* Protected — with layout */}
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/" element={<FeedPage />} />
            <Route path="/groups" element={<GroupsPage />} />
            <Route path="/groups/create" element={<CreateGroupPage />} />
            <Route path="/groups/:slug" element={<GroupDetailPage />} />
            <Route path="/users/:username" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/settings/profile" element={<EditProfilePage />} />
            <Route path="/settings/username" element={<ChangeUsernamePage />} />
            <Route path="/settings/email" element={<ChangeEmailPage />} />
            <Route path="/settings/password" element={<ChangePasswordPage />} />
            <Route path="/settings/delete-account" element={<DeleteAccountPage />} />
          </Route>
        </Routes>
        <Toaster />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

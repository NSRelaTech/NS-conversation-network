import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type RegisterForm = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const signup = useMutation({
    mutationFn: (data: RegisterForm) =>
      api<any>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          username: data.username,
          email: data.email,
          password: data.password,
        }),
      }),
    onSuccess: (data) => {
      // MVP: auto-verified, so log in directly if tokens returned
      if (data.tokens) {
        setAuth(
          { accessToken: data.tokens.accessToken, refreshToken: data.tokens.refreshToken },
          { id: data.userId, email: data.email, username: data.username }
        );
        navigate('/');
      } else {
        // Fallback: redirect to login
        navigate('/auth/login');
      }
    },
  });

  return (
    <AuthLayout title="Create an account" description="Join the community">
      <form onSubmit={handleSubmit((d) => signup.mutate(d))} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input id="username" {...register('username')} />
          {errors.username && <p className="text-sm text-red-500">{errors.username.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register('email')} />
          {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" {...register('password')} />
          {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input id="confirmPassword" type="password" {...register('confirmPassword')} />
          {errors.confirmPassword && <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>}
        </div>
        {signup.error && (
          <p className="text-sm text-red-500">{signup.error.message}</p>
        )}
        <Button type="submit" className="w-full" disabled={signup.isPending}>
          {signup.isPending ? 'Creating account...' : 'Create account'}
        </Button>
        <p className="text-center text-sm text-stone-500">
          Already have an account?{' '}
          <Link to="/auth/login" className="font-medium text-stone-900 underline">
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

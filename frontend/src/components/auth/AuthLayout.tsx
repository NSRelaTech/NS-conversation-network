import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface AuthLayoutProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export function AuthLayout({ title, description, children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen">
      {/* Left panel — branding (desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-stone-900 text-white flex-col justify-between p-12">
        {/* Decorative background pattern */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: '32px 32px',
        }} />

        <div className="relative z-10">
          <h1 className="text-2xl font-semibold tracking-tight">NS Conversation Network</h1>
          <p className="mt-1 text-stone-400 text-sm">Novi Sad Community Platform</p>
        </div>

        <div className="relative z-10 max-w-md">
          <blockquote className="text-lg leading-relaxed text-stone-300">
            "Quality comes from structured, facilitated conversations — not algorithmic feeds."
          </blockquote>
          <p className="mt-4 text-sm text-stone-500">
            Inspired by Conversation Networks (Roy, Lessig, Tang 2025)
          </p>
        </div>

        <div className="relative z-10 flex flex-col gap-3 text-sm text-stone-400">
          <div className="flex items-center gap-3">
            <div className="h-1.5 w-1.5 rounded-full bg-stone-500" />
            <span>Conversations over content</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-1.5 w-1.5 rounded-full bg-stone-500" />
            <span>AI as assistive, never mediating</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-1.5 w-1.5 rounded-full bg-stone-500" />
            <span>Open standards, interoperable tools</span>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col items-center justify-center bg-stone-50 px-4">
        {/* Mobile branding (above form) */}
        <div className="mb-8 text-center lg:hidden">
          <h1 className="text-xl font-semibold text-stone-900">NS Conversation Network</h1>
          <p className="mt-1 text-sm text-stone-500">Novi Sad Community Platform</p>
        </div>

        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>

        <p className="mt-6 text-xs text-stone-400 text-center max-w-sm">
          Built by <a href="https://github.com/NSRelaTech" target="_blank" rel="noopener noreferrer" className="underline hover:text-stone-600">NSRelaTech</a> for the Novi Sad community
        </p>
      </div>
    </div>
  );
}

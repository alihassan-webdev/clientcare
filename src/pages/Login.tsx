import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Headphones, Loader2, Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const Login = () => {
  const { login, isLoading, isAuthenticated, role } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  if (isAuthenticated) {
    return <Navigate to={role === 'admin' ? '/admin/dashboard' : '/dashboard'} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }
    try {
      await login(email, password);
    } catch (error: any) {
      setError(error?.message || 'Login failed. Please try again.');
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4 bg-background">
      <div className="relative z-10 w-full max-w-[900px] animate-fade-in flex flex-col lg:flex-row lg:items-center lg:gap-16 gap-10">
        {/* Branding Side */}
        <div className="flex flex-col items-center lg:w-[40%] text-center">
          <div className="mb-5 flex h-20 w-20 lg:h-24 lg:w-24 items-center justify-center rounded-2xl bg-primary shadow-primary-glow transition-transform hover:scale-105">
            <Headphones className="h-10 w-10 lg:h-12 lg:w-12 text-primary-foreground" />
          </div>
          <h1 className="font-heading text-[28px] lg:text-4xl font-bold tracking-tight text-foreground">Client Care</h1>
          <p className="mt-2 text-sm lg:text-base text-muted-foreground max-w-[280px]">Your all-in-one support portal for seamless customer service</p>
        </div>

        {/* Form Card */}
        <div className="flex-1 glass-strong rounded-2xl border border-border p-7 shadow-premium-lg">
          <div className="mb-6">
            <h2 className="font-heading text-xl font-bold text-foreground">Welcome back</h2>
            <p className="mt-1 text-sm text-muted-foreground">Sign in to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-lg bg-destructive/10 px-4 py-2.5 text-sm font-medium text-destructive animate-scale-in">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="login-email" className="text-[13px] font-semibold">Email</Label>
              <Input
                id="login-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={isLoading}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password" className="text-[13px] font-semibold">Password</Label>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="h-11 pr-10"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 hover:-translate-y-0.5 shadow-primary-glow disabled:opacity-60 disabled:pointer-events-none"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
};

export default Login;

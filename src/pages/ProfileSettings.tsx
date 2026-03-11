import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { User as UserIcon, Save, Eye, EyeOff } from 'lucide-react';

const ProfileSettings = () => {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [company, setCompany] = useState(user?.company || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error('Name and email are required');
      return;
    }
    if (password && password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (password && password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    const updates: any = { name, email, phone, company };
    if (password) updates.password = password;
    updateProfile(updates);
    setPassword('');
    setConfirmPassword('');
    toast.success('Profile updated successfully');
  };

  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Profile Settings</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Update your personal information</p>
      </div>

      <form onSubmit={handleSubmit} className="card-premium p-6 space-y-5">
        <div className="flex items-center gap-4 pb-5 border-b border-border">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <UserIcon className="h-7 w-7 text-primary" />
          </div>
          <div>
            <p className="font-heading text-lg font-semibold text-card-foreground capitalize">{user.name}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-card-foreground">Full Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-card-foreground">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-card-foreground">Phone Number</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+92 300 1234567" className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-card-foreground">Company</label>
            <input type="text" value={company} onChange={e => setCompany(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
        </div>

        <div className="border-t border-border pt-5">
          <h3 className="mb-3 text-sm font-semibold text-card-foreground">Change Password</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-card-foreground">New Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Leave blank to keep current" className="w-full rounded-lg border border-input bg-background px-3 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-card-foreground">Confirm Password</label>
              <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm new password" className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-border">
          <button type="submit" className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 shadow-primary-glow">
            <Save className="h-4 w-4" />
            Update Profile
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProfileSettings;

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { User } from '@/types';
import { toast } from 'sonner';
import { Users, Pencil, Trash2, X, Save, Eye, EyeOff, Search, Plus, Lock, RotateCw } from 'lucide-react';

const AdminSettings = () => {
  const { users, updateUser, deleteUser, addUser, user: currentUser, syncUsers } = useAuth();
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', company: '', password: '', role: 'customer' as const });
  const [showPassword, setShowPassword] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', email: '', phone: '', company: '', password: '', role: 'customer' as const });
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sync users from database on component mount
  useEffect(() => {
    syncUsers();
  }, [syncUsers]);

  const filteredUsers = users.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.company.toLowerCase().includes(q);
  });

  const startEdit = (u: User) => {
    setEditingUser(u);
    setEditForm({ name: u.name, email: u.email, phone: u.phone, company: u.company, password: '', role: u.role });
    setShowPassword(false);
  };

  const handleSave = () => {
    if (!editingUser) return;
    if (!editForm.name.trim() || !editForm.email.trim()) {
      toast.error('Name and email are required');
      return;
    }
    if (editForm.password && editForm.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (editingUser.isProtected && editForm.role !== editingUser.role) {
      toast.error('Cannot change the role of a protected account');
      return;
    }
    const updates: any = { name: editForm.name, email: editForm.email, phone: editForm.phone, company: editForm.company, role: editForm.role };
    if (editForm.password) updates.password = editForm.password;
    try {
      updateUser(editingUser.id, updates);

      // If current user's role changed, show logout notification and trigger logout
      if (currentUser?.id === editingUser.id && currentUser.role !== editForm.role) {
        setTimeout(() => {
          toast.info('Your role has been changed. Please log in again.');
        }, 500);
      }

      setEditingUser(null);
      // Sync users to ensure UI shows the updated user
      syncUsers();
      toast.success('User updated successfully');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update user');
    }
  };

  const handleAddUser = async () => {
    if (!addForm.name.trim() || !addForm.email.trim() || !addForm.password.trim()) {
      toast.error('Name, email and password are required');
      return;
    }
    if (addForm.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    const exists = users.find(u => u.email.toLowerCase() === addForm.email.toLowerCase());
    if (exists) {
      toast.error('A user with this email already exists');
      return;
    }
    try {
      await addUser(addForm.name, addForm.email, addForm.phone, addForm.company, addForm.password, addForm.role);
      setShowAddUser(false);
      setAddForm({ name: '', email: '', phone: '', company: '', password: '', role: 'customer' });
      // Sync users to ensure UI shows the newly added user
      syncUsers();
      toast.success('User added successfully');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to add user');
    }
  };

  const handleDelete = async (id: string) => {
    if (id === currentUser?.id) {
      toast.error('You cannot delete your own account');
      return;
    }
    const userToDelete = users.find(u => u.id === id);
    if (userToDelete?.isProtected) {
      toast.error('This account is protected and cannot be deleted');
      return;
    }
    try {
      await deleteUser(id);
      // Sync users immediately to refresh the list from localStorage
      syncUsers();
      setDeleteConfirm(null);
      toast.success('User deleted successfully');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete user');
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      syncUsers();
      toast.success('Users refreshed successfully');
    } catch (error: any) {
      toast.error('Failed to refresh users');
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatDate = (iso?: string) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const inputClasses = "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm transition-colors focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">User Management</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Manage all registered users</p>
        </div>
        <button
          onClick={() => { setShowAddUser(true); setAddForm({ name: '', email: '', phone: '', company: '', password: '', role: 'customer' }); setShowAddPassword(false); }}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 hover:-translate-y-0.5 shadow-primary-glow"
        >
          <Plus className="h-4 w-4" /> Add User
        </button>
      </div>

      {/* Add User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/25 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-premium-xl animate-scale-in">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-heading text-lg font-semibold text-card-foreground">Add New User</h3>
              <button onClick={() => setShowAddUser(false)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-card-foreground">Full Name</label>
                  <input type="text" value={addForm.name} onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))} placeholder="John Doe" className={inputClasses} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-card-foreground">Email</label>
                  <input type="email" value={addForm.email} onChange={e => setAddForm(p => ({ ...p, email: e.target.value }))} placeholder="user@example.com" className={inputClasses} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-card-foreground">Phone</label>
                  <input type="tel" value={addForm.phone} onChange={e => setAddForm(p => ({ ...p, phone: e.target.value }))} placeholder="+92 300 1234567" className={inputClasses} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-card-foreground">Company</label>
                  <input type="text" value={addForm.company} onChange={e => setAddForm(p => ({ ...p, company: e.target.value }))} placeholder="Company Name" className={inputClasses} />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-card-foreground">Role</label>
                <select value={addForm.role} onChange={e => setAddForm(p => ({ ...p, role: e.target.value as 'admin' | 'customer' }))} className={inputClasses}>
                  <option value="customer">Customer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-card-foreground">Password</label>
                <div className="relative">
                  <input type={showAddPassword ? 'text' : 'password'} value={addForm.password} onChange={e => setAddForm(p => ({ ...p, password: e.target.value }))} placeholder="Min 6 characters" className={`${inputClasses} pr-10`} />
                  <button type="button" onClick={() => setShowAddPassword(!showAddPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showAddPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2.5">
              <button onClick={() => setShowAddUser(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent">Cancel</button>
              <button onClick={handleAddUser} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 shadow-primary-glow">
                <Plus className="h-3.5 w-3.5" /> Add User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/25 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-premium-xl animate-scale-in">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-heading text-lg font-semibold text-card-foreground">Edit User</h3>
              <button onClick={() => setEditingUser(null)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-card-foreground">Full Name</label>
                  <input type="text" value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} className={inputClasses} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-card-foreground">Email</label>
                  <input type="email" value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} className={inputClasses} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-card-foreground">Phone</label>
                  <input type="tel" value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} className={inputClasses} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-card-foreground">Company</label>
                  <input type="text" value={editForm.company} onChange={e => setEditForm(p => ({ ...p, company: e.target.value }))} className={inputClasses} />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-card-foreground">Role {editingUser?.isProtected && <span className="text-amber-600">(Protected)</span>}</label>
                <select
                  value={editForm.role}
                  onChange={e => setEditForm(p => ({ ...p, role: e.target.value as 'admin' | 'customer' }))}
                  disabled={editingUser?.isProtected}
                  className={`${inputClasses} ${editingUser?.isProtected ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title={editingUser?.isProtected ? 'Cannot change role of protected account' : ''}
                >
                  <option value="customer">Customer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-card-foreground">New Password</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={editForm.password} onChange={e => setEditForm(p => ({ ...p, password: e.target.value }))} placeholder="Leave blank to keep current" className={`${inputClasses} pr-10`} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2.5">
              <button onClick={() => setEditingUser(null)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent">Cancel</button>
              <button onClick={handleSave} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 shadow-primary-glow">
                <Save className="h-3.5 w-3.5" /> Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/25 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-premium-xl animate-scale-in">
            <h3 className="font-heading text-lg font-semibold text-card-foreground">Delete User</h3>
            <p className="mt-2 text-sm text-muted-foreground">Are you sure you want to delete this user? This action cannot be undone.</p>
            <div className="mt-6 flex justify-end gap-2.5">
              <button onClick={() => setDeleteConfirm(null)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="card-premium p-3.5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search users by name, email, or company..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={`${inputClasses} pl-9`}
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="card-premium overflow-hidden">
        <div className="border-b border-border px-5 py-3.5 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-heading text-sm font-semibold text-card-foreground">
            <Users className="h-4 w-4" /> All Users ({filteredUsers.length})
          </h3>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh users list"
          >
            <RotateCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Email</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Phone</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Company</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Registered</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Role</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(u => (
                <tr key={u.id} className="border-b border-border transition-colors hover:bg-accent/40">
                  <td className="px-4 py-3.5 font-medium text-card-foreground capitalize">{u.name}</td>
                  <td className="px-4 py-3.5 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3.5 text-muted-foreground">{u.phone || '—'}</td>
                  <td className="px-4 py-3.5 text-muted-foreground">{u.company}</td>
                  <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">{formatDate(u.registeredAt)}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        u.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-secondary text-secondary-foreground'
                      }`}>
                        {u.role === 'admin' ? 'Admin' : 'Customer'}
                      </span>
                      {u.isProtected && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                          <Lock className="h-3 w-3" /> Protected
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {u.email !== 'ali.hassan@aviratechnologies.com' && (
                        <>
                          <button onClick={() => startEdit(u)} className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" title="Edit">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          {u.id !== currentUser?.id && !u.isProtected && (
                            <button onClick={() => setDeleteConfirm(u.id)} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors" title="Delete">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </>
                      )}
                      {(u.isProtected || u.email === 'ali.hassan@aviratechnologies.com') && (
                        <button disabled className="rounded-lg p-2 text-muted-foreground cursor-not-allowed" title="This account is protected and cannot be modified">
                          <Lock className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-muted-foreground">No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;

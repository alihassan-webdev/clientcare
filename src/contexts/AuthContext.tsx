import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { User, UserRole } from '@/types';
import { mockUsers } from '@/data/mockData';
import { auth } from '@/firebase';
import { signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword, deleteUser as firebaseDeleteUser } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  users: User[];
  login: (email: string, password: string) => Promise<void>;
  addUser: (name: string, email: string, phone: string, company: string, password: string, userRole?: UserRole) => Promise<User>;
  logout: () => void;
  updateProfile: (updates: Partial<User> & { password?: string }) => void;
  updateUser: (id: string, updates: Partial<User> & { password?: string }) => void;
  deleteUser: (id: string) => Promise<void>;
  syncUsers: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState<User[]>(() => {
    const storedUsers = localStorage.getItem('cc_users');
    return storedUsers ? JSON.parse(storedUsers) : mockUsers;
  });

  useEffect(() => {
    const storedUser = localStorage.getItem('cc_user');
    const storedRole = localStorage.getItem('cc_role');
    const storedToken = localStorage.getItem('cc_token');
    if (storedUser && storedRole && storedToken) {
      setUser(JSON.parse(storedUser));
      setRole(storedRole as UserRole);
    }
  }, []);

  // Persist users to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('cc_users', JSON.stringify(users));
  }, [users]);

  // Listen for storage changes (e.g., when users are modified in another tab)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'cc_users' && e.newValue) {
        try {
          const updatedUsers = JSON.parse(e.newValue);
          setUsers(updatedUsers);
        } catch (error) {
          console.error('Failed to sync users from storage:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // Authenticate with Firebase - this is the primary source of truth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      // Check if user exists in local database for role/profile info
      let existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());

      // If user doesn't exist locally, create a user object from Firebase with admin role
      const userObj: User = existingUser || {
        id: userCredential.user.uid,
        name: email.split('@')[0],
        email: userCredential.user.email || email,
        phone: '',
        role: 'admin', // New Firebase users get admin role by default
        company: '',
        registeredAt: new Date().toISOString(),
      };

      // If user didn't exist in database and we created them as admin, add them to the users list
      if (!existingUser) {
        setUsers(prev => [...prev, userObj]);
      }

      const token = userCredential.user.getIdToken ? await userCredential.user.getIdToken() : 'firebase_jwt_' + Date.now();
      localStorage.setItem('cc_token', token);
      localStorage.setItem('cc_role', userObj.role);
      localStorage.setItem('cc_user', JSON.stringify(userObj));
      setUser(userObj);
      setRole(userObj.role);
    } catch (error: any) {
      let errorMessage = 'Login failed';

      if (error?.code === 'auth/user-not-found') {
        errorMessage = 'Email not registered';
      } else if (error?.code === 'auth/wrong-password') {
        errorMessage = 'Invalid password';
      } else if (error?.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid email or password';
      } else if (error?.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address';
      } else if (error?.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled';
      } else if (error?.code === 'auth/too-many-requests') {
        errorMessage = 'Too many login attempts. Please try again later';
      } else {
        errorMessage = error?.message || 'Login failed. Please try again.';
      }
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [users]);

  const addUser = useCallback(async (name: string, email: string, phone: string, company: string, password: string, userRole: UserRole = 'customer') => {
    try {
      // Create user in Firebase
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      const newUser: User = {
        id: userCredential.user.uid,
        name, email, phone, role: userRole, company,
        password,
        registeredAt: new Date().toISOString(),
      };
      setUsers(prev => [...prev, newUser]);
      return newUser;
    } catch (error: any) {
      const errorMessage = error?.code === 'auth/email-already-in-use'
        ? 'Email already registered in Firebase'
        : error?.code === 'auth/weak-password'
        ? 'Password is too weak'
        : error?.message || 'Failed to add user';
      throw new Error(errorMessage);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.log('Error signing out from Firebase:', error);
    }
    localStorage.removeItem('cc_token');
    localStorage.removeItem('cc_role');
    localStorage.removeItem('cc_user');
    setUser(null);
    setRole(null);
  }, []);

  const updateProfile = useCallback((updates: Partial<User> & { password?: string }) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      localStorage.setItem('cc_user', JSON.stringify(updated));
      return updated;
    });
    setUsers(prev => prev.map(u => u.id === user?.id ? { ...u, ...updates } : u));
  }, [user?.id]);

  const updateUser = useCallback((id: string, updates: Partial<User> & { password?: string }) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
    if (user?.id === id) {
      // If role is being changed for current user, logout after a short delay
      if (updates.role && updates.role !== user.role) {
        setTimeout(() => {
          logout();
        }, 1000);
      }
      setUser(prev => {
        if (!prev) return prev;
        const updated = { ...prev, ...updates };
        localStorage.setItem('cc_user', JSON.stringify(updated));
        return updated;
      });
    }
  }, [user?.id, user?.role, logout]);

  const deleteUser = useCallback(async (id: string) => {
    try {
      // If deleting the current user
      if (user?.id === id && auth.currentUser) {
        await firebaseDeleteUser(auth.currentUser);
        // Also logout
        localStorage.removeItem('cc_token');
        localStorage.removeItem('cc_role');
        localStorage.removeItem('cc_user');
        setUser(null);
        setRole(null);
      }
      // Remove from local database
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to delete user';
      throw new Error(errorMessage);
    }
  }, [user?.id]);

  const syncUsers = useCallback(() => {
    try {
      const storedUsers = localStorage.getItem('cc_users');
      if (storedUsers) {
        const loadedUsers = JSON.parse(storedUsers);
        setUsers(loadedUsers);
      }
    } catch (error) {
      console.error('Failed to sync users from storage:', error);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, isAuthenticated: !!user, isLoading, users, login, addUser, logout, updateProfile, updateUser, deleteUser, syncUsers }}>
      {children}
    </AuthContext.Provider>
  );
};

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { User, UserRole } from '@/types';
import { mockUsers } from '@/data/mockData';
import { auth } from '@/firebase';
import { signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword, deleteUser as firebaseDeleteUser } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, query, getDocs, setDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';

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
  usersLoading: boolean;
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
  const [usersLoading, setUsersLoading] = useState(true);
  const [users, setUsers] = useState<User[]>(() => {
    const storedUsers = localStorage.getItem('cc_users');
    return storedUsers ? JSON.parse(storedUsers) : mockUsers;
  });

  const db = getFirestore();
  const usersCollection = collection(db, 'users');

  useEffect(() => {
    const storedUser = localStorage.getItem('cc_user');
    const storedRole = localStorage.getItem('cc_role');
    const storedToken = localStorage.getItem('cc_token');
    if (storedUser && storedRole && storedToken) {
      setUser(JSON.parse(storedUser));
      setRole(storedRole as UserRole);
    }
  }, []);

  // Real-time listener for Firestore users collection
  useEffect(() => {
    try {
      const unsubscribe = onSnapshot(
        query(usersCollection),
        (snapshot) => {
          const firestoreUsers: User[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            // Convert Firestore user to app User type
            firestoreUsers.push({
              id: data.uid || doc.id,
              name: data.name || '',
              email: data.email || '',
              phone: data.phone || '',
              company: data.company || '',
              role: (data.role || 'customer') as UserRole,
              registeredAt: data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString(),
            });
          });

          // Only update if we got data from Firestore (not empty)
          // Also keep protected accounts from localStorage
          if (firestoreUsers.length > 0) {
            const storedUsers = localStorage.getItem('cc_users');
            const localUsers = storedUsers ? JSON.parse(storedUsers) : [];
            const protectedUsers = localUsers.filter((u: User) => u.isProtected);

            // Merge: Firestore users + protected local users
            const mergedUsers = [...firestoreUsers];
            protectedUsers.forEach((protected_user: User) => {
              if (!mergedUsers.find(u => u.id === protected_user.id)) {
                mergedUsers.push(protected_user);
              }
            });

            setUsers(mergedUsers);
            localStorage.setItem('cc_users', JSON.stringify(mergedUsers));
          }

          setUsersLoading(false);
        },
        (error) => {
          console.error('Error listening to Firestore users:', error);
          // Fallback to localStorage on error
          setUsersLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error('Error setting up Firestore listener:', error);
      setUsersLoading(false);
    }
  }, [usersCollection]);

  // Initialize localStorage with mock data if empty
  useEffect(() => {
    const stored = localStorage.getItem('cc_users');
    if (!stored) {
      localStorage.setItem('cc_users', JSON.stringify(mockUsers));
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
        setUsers(prev => {
          const updated = [...prev, userObj];
          return updated;
        });
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
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      // Also add to Firestore (Cloud Functions should handle this, but we do it as backup)
      try {
        await setDoc(doc(db, 'users', uid), {
          uid,
          name,
          email,
          phone,
          company,
          role: userRole,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          syncedWithAuth: true,
        });
      } catch (firestoreError) {
        console.warn('Could not save to Firestore, relying on Cloud Functions:', firestoreError);
      }

      const newUser: User = {
        id: uid,
        name, email, phone, role: userRole, company,
        password,
        registeredAt: new Date().toISOString(),
      };

      setUsers(prev => {
        const updated = [...prev, newUser];
        localStorage.setItem('cc_users', JSON.stringify(updated));
        return updated;
      });

      return newUser;
    } catch (error: any) {
      const errorMessage = error?.code === 'auth/email-already-in-use'
        ? 'Email already registered in Firebase'
        : error?.code === 'auth/weak-password'
        ? 'Password is too weak'
        : error?.message || 'Failed to add user';
      throw new Error(errorMessage);
    }
  }, [db]);

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
    // Check if trying to change role of protected user
    const userToUpdate = users.find(u => u.id === id);
    if (userToUpdate?.isProtected && updates.role && updates.role !== userToUpdate.role) {
      throw new Error('Cannot change the role of a protected account');
    }

    // Prepare Firestore update (exclude fields that don't exist in Firestore schema)
    const firestoreUpdate: any = {};
    if (updates.name) firestoreUpdate.name = updates.name;
    if (updates.email) firestoreUpdate.email = updates.email;
    if (updates.phone) firestoreUpdate.phone = updates.phone;
    if (updates.company) firestoreUpdate.company = updates.company;
    if (updates.role) firestoreUpdate.role = updates.role;
    firestoreUpdate.updatedAt = Date.now();

    // Update Firestore
    if (Object.keys(firestoreUpdate).length > 1) {
      updateDoc(doc(db, 'users', id), firestoreUpdate).catch(error => {
        console.warn('Could not update user in Firestore:', error);
      });
    }

    // Update local state
    setUsers(prev => {
      const updated = prev.map(u => u.id === id ? { ...u, ...updates } : u);
      localStorage.setItem('cc_users', JSON.stringify(updated));
      return updated;
    });

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
  }, [user?.id, user?.role, logout, users, db]);

  const deleteUser = useCallback(async (id: string) => {
    try {
      // Check if user is protected - cannot be deleted by anyone
      const userToDelete = users.find(u => u.id === id);
      if (userToDelete?.isProtected) {
        throw new Error('This account is protected and cannot be deleted');
      }

      // Remove from Firestore first
      try {
        await deleteDoc(doc(db, 'users', id));
        // Cloud Functions will handle deleting from Auth when Firestore doc is deleted
      } catch (firestoreError) {
        console.warn('Could not delete user from Firestore:', firestoreError);
      }

      // If deleting the current user from Firebase Auth
      if (user?.id === id && auth.currentUser) {
        try {
          await firebaseDeleteUser(auth.currentUser);
        } catch (authError) {
          console.warn('Could not delete user from Firebase Auth:', authError);
        }
        // Also logout
        localStorage.removeItem('cc_token');
        localStorage.removeItem('cc_role');
        localStorage.removeItem('cc_user');
        setUser(null);
        setRole(null);
      }

      // Remove from local state
      setUsers(prev => {
        const updated = prev.filter(u => u.id !== id);
        localStorage.setItem('cc_users', JSON.stringify(updated));
        return updated;
      });
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to delete user';
      throw new Error(errorMessage);
    }
  }, [user?.id, users, db, auth]);

  const syncUsers = useCallback(() => {
    try {
      setUsersLoading(true);
      // Fetch latest from Firestore
      getDocs(usersCollection).then(snapshot => {
        const firestoreUsers: User[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          firestoreUsers.push({
            id: data.uid || doc.id,
            name: data.name || '',
            email: data.email || '',
            phone: data.phone || '',
            company: data.company || '',
            role: (data.role || 'customer') as UserRole,
            registeredAt: data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString(),
          });
        });

        if (firestoreUsers.length > 0) {
          // Also preserve protected users from localStorage
          const storedUsers = localStorage.getItem('cc_users');
          const localUsers = storedUsers ? JSON.parse(storedUsers) : [];
          const protectedUsers = localUsers.filter((u: User) => u.isProtected);

          const mergedUsers = [...firestoreUsers];
          protectedUsers.forEach((protected_user: User) => {
            if (!mergedUsers.find(u => u.id === protected_user.id)) {
              mergedUsers.push(protected_user);
            }
          });

          setUsers(mergedUsers);
          localStorage.setItem('cc_users', JSON.stringify(mergedUsers));
        } else {
          const storedUsers = localStorage.getItem('cc_users');
          if (storedUsers) {
            const loadedUsers = JSON.parse(storedUsers);
            if (Array.isArray(loadedUsers)) {
              setUsers(loadedUsers);
            }
          }
        }
        setUsersLoading(false);
      }).catch(error => {
        console.error('Error fetching users from Firestore:', error);
        setUsersLoading(false);
      });
    } catch (error) {
      console.error('Failed to sync users:', error);
      setUsersLoading(false);
    }
  }, [usersCollection]);

  return (
    <AuthContext.Provider value={{ user, role, isAuthenticated: !!user, isLoading, usersLoading, users, login, addUser, logout, updateProfile, updateUser, deleteUser, syncUsers }}>
      {children}
    </AuthContext.Provider>
  );
};

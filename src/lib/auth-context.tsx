'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, set, update } from 'firebase/database';
import { auth, db, rtdb } from './firebase-config'; 

interface User extends FirebaseUser {
  role?: 'DONOR' | 'RECIPIENT'; // Add role field
}

interface AuthContextType {
  user: User | null;
  userData: any | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, userData: any) => Promise<void>;
  logout: () => Promise<void>;
  updateUserRole: (role: 'donor' | 'recipient') => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Get user data from Firestore
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // Set the role on the user object for easier access
            (user as User).role = userData.role?.toUpperCase() as 'DONOR' | 'RECIPIENT';
            
            setUserData(userData);
          }
          setUser(user as User);
        } catch (error) {
          console.error('Error fetching user data:', error);
          setUser(user as User);
        }
      } else {
        setUser(null);
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error('Login error:', error);
      setError(error.message);
      throw error;
    }
  };

  const register = async (email: string, password: string, userData: any) => {
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Save to Firestore (detailed profile)
      await setDoc(doc(db, 'users', user.uid), {
        ...userData,
        email,
        createdAt: new Date(),
        role: userData.role || 'donor',
      });

      // Save to Realtime DB (online status, quick access)
      await set(ref(rtdb, `users/${user.uid}`), {
        name: userData.name,
        email,
        bloodType: userData.bloodType,
        online: true,
        lastActive: new Date().toISOString()
      });

      // Add to blood type group if applicable
      if (userData.bloodType) {
        await set(ref(rtdb, `bloodGroups/${userData.bloodType}/${user.uid}`), true);
      }

    } catch (error: any) {
      console.error('Registration error:', error);
      setError(error.message);
      throw error;
    }
  };

  const logout = async () => {
    setError(null);
    try {
      if (user) {
        // Update online status before signing out
        await set(ref(rtdb, `users/${user.uid}/online`), false);
      }
      await signOut(auth);
    } catch (error: any) {
      console.error('Logout error:', error);
      setError(error.message);
      throw error;
    }
  };

  const updateUserRole = async (role: 'donor' | 'recipient') => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');
      
      // Make role uppercase for consistency
      const roleUppercase = role.toUpperCase();
      
      console.log(`Updating user role to ${roleUppercase}`);
      
      // Update in Firestore
      await updateDoc(doc(db, 'users', user.uid), {
        role: roleUppercase,
        updatedAt: new Date()
      });
      
      // Update realtime database for faster access
      await update(ref(rtdb, `users/${user.uid}`), {
        role: roleUppercase,
        updatedAt: new Date().toISOString()
      });
      
      // Update user state with new role
      setUser(currentUser => {
        if (!currentUser) return null;
        
        // Create a new user object with the updated role
        const updatedUser = { ...currentUser } as User;
        updatedUser.role = roleUppercase as 'DONOR' | 'RECIPIENT';
        return updatedUser;
      });
      

      
      // Update user data state
      setUserData((currentData: any) => {
        if (!currentData) return null;
        return {
          ...currentData,
          role: roleUppercase
        };
      });
      
      // Store role in localStorage as a fallback
      localStorage.setItem('userRole', roleUppercase);
      
      console.log(`Role successfully updated to ${roleUppercase}`);
      return true;
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userData,
        loading,
        error,
        login,
        register,
        logout,
        updateUserRole
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
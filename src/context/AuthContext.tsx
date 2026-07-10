import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  isDriver: boolean;
  isCustomer: boolean;
  isCashier: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const generateReferralCode = () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        try {
          const profileDoc = await getDoc(doc(db, 'users', user.uid)).catch(err => {
            handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
            throw err;
          });
          if (profileDoc.exists()) {
            const data = profileDoc.data();
            // Migrate old users if needed
            if (!data.referralCode) {
              const referralCode = generateReferralCode();
              await setDoc(doc(db, 'users', user.uid), { ...data, referralCode }, { merge: true });
              setProfile({ ...data, referralCode } as UserProfile);
            } else {
              setProfile(data as UserProfile);
            }
          } else {
            // Default profile for new users (authenticated via social login)
            const newProfile: UserProfile = {
              userId: user.uid,
              name: user.displayName || 'New User',
              email: user.email || '',
              role: 'customer',
              loyaltyPoints: 0,
              referralCode: generateReferralCode(),
              isFirstOrderCompleted: false,
              createdAt: new Date().toISOString(),
            };
            await setDoc(doc(db, 'users', user.uid), newProfile).catch(err => {
              handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
              throw err;
            });
            setProfile(newProfile);
          }
        } catch (err) {
          console.error("Auth initialization error:", err);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = {
    user,
    profile,
    loading,
    isAdmin: profile?.role === 'admin',
    isOwner: profile?.role === 'owner',
    isDriver: profile?.role === 'driver',
    isCustomer: profile?.role === 'customer',
    isCashier: profile?.role === 'cashier',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

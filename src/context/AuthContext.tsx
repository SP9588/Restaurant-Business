import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
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
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (currentUser) {
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          
          // Setup real-time listener for user profile
          unsubscribeProfile = onSnapshot(userDocRef, async (profileSnap) => {
            if (profileSnap.exists()) {
              const data = profileSnap.data();
              // Migrate old users if needed
              if (!data.referralCode) {
                const referralCode = generateReferralCode();
                await setDoc(userDocRef, { referralCode }, { merge: true });
                setProfile({ ...data, referralCode } as UserProfile);
              } else {
                setProfile(data as UserProfile);
              }
              setLoading(false);
            } else {
              // Default profile for new users (authenticated via social login)
              const newProfile: UserProfile = {
                userId: currentUser.uid,
                name: currentUser.displayName || 'New User',
                email: currentUser.email || '',
                role: 'customer',
                loyaltyPoints: 0,
                referralCode: generateReferralCode(),
                isFirstOrderCompleted: false,
                createdAt: new Date().toISOString(),
              };
              await setDoc(userDocRef, newProfile).catch(err => {
                handleFirestoreError(err, OperationType.WRITE, `users/${currentUser.uid}`);
                throw err;
              });
              setProfile(newProfile);
              setLoading(false);
            }
          }, (err) => {
            console.error("Profile sync error:", err);
            setLoading(false);
          });
        } catch (err) {
          console.error("Auth initialization error:", err);
          setLoading(false);
        }
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
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

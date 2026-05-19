import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile, UserRole } from '../types';

interface AppContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  currentScreen: string;
  setScreen: (screen: string) => void;
  activeRide: any | null;
  setActiveRide: (ride: any | null) => void;
  signOut: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentScreen, setScreen] = useState('splash');
  const [activeRide, setActiveRide] = useState<any | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const profileDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (profileDoc.exists()) {
            setProfile(profileDoc.data() as UserProfile);
            if (currentScreen === 'splash' || currentScreen === 'auth') {
              setScreen(profileDoc.data().role === 'driver' ? 'driver-home' : 'passenger-home');
            }
          } else {
            setScreen('auth-role-selection');
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
        }
      } else {
        setProfile(null);
        if (currentScreen !== 'splash') setScreen('auth');
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signOut = async () => {
    await auth.signOut();
    setScreen('auth');
  };

  return (
    <AppContext.Provider value={{ user, profile, loading, currentScreen, setScreen, activeRide, setActiveRide, signOut }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};

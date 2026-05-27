import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, collection, query, where } from 'firebase/firestore';
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
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Set up real-time listener on user profile
        unsubscribeProfile = onSnapshot(doc(db, 'users', firebaseUser.uid), (snapshot) => {
          if (snapshot.exists()) {
            const profileData = { uid: snapshot.id, ...snapshot.data() } as UserProfile;
            setProfile(profileData);
            setScreen((prev) => {
              if (prev === 'splash' || prev === 'auth') {
                return profileData.role === 'driver' ? 'driver-home' : 'passenger-home';
              }
              return prev;
            });
          } else {
            setProfile(null);
            setScreen('auth-role-selection');
          }
          setLoading(false);
        }, (error) => {
          console.error("Profile listening error:", error);
          setLoading(false);
        });
      } else {
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }
        setProfile(null);
        setScreen((prev) => (prev !== 'splash' ? 'auth' : prev));
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

  // Monitor and restore recent active or ongoing ride states for both driver and passenger roles
  useEffect(() => {
    if (!user || !profile) {
      setActiveRide(null);
      return;
    }

    const q = query(
      collection(db, 'rides'),
      where(profile.role === 'driver' ? 'driverId' : 'passengerId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) return;

      const matchedRides = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      // Sort matches descending by creation date or timestamp
      matchedRides.sort((a, b) => {
        const tA = a.createdAt?.seconds || 0;
        const tB = b.createdAt?.seconds || 0;
        return tB - tA;
      });

      const latestRide = matchedRides[0];
      if (latestRide) {
        const isOngoing = ['requested', 'accepted', 'arrived', 'started'].includes(latestRide.status);
        
        if (isOngoing) {
          setActiveRide(latestRide);
          setScreen('tracking');
        } else if (latestRide.status === 'completed') {
          // Keep completed state representation inside state if they were already viewing it,
          // otherwise let manual closing handle cleanup.
          setActiveRide((prev: any) => {
            if (prev && prev.id === latestRide.id) {
              return latestRide;
            }
            return prev;
          });
        }
      }
    }, (error) => {
      console.error("Error monitoring active rides:", error);
    });

    return () => unsubscribe();
  }, [user, profile?.role]);

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

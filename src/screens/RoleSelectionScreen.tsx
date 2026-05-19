import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { UserRole } from '../types';
import { User, Car, Shield } from 'lucide-react';
import { cn } from '../lib/utils';

export default function RoleSelectionScreen() {
  const { user, setScreen } = useApp();
  const [loading, setLoading] = useState(false);

  const selectRole = async (role: UserRole) => {
    if (!user) return;
    setLoading(true);
    try {
      const profile = {
        uid: user.uid,
        email: user.email!,
        displayName: user.displayName || 'Anonymous User',
        role,
        phoneNumber: user.phoneNumber || '',
        photoURL: user.photoURL || '',
        createdAt: new Date().toISOString(),
        isVerified: false,
      };
      await setDoc(doc(db, 'users', user.uid), profile);
      
      if (role === 'driver') {
        const driverProfile = {
          userId: user.uid,
          vehicleModel: '',
          plateNumber: '',
          isOnline: false,
          currentLocation: { lat: 0, lng: 0 },
          rating: 5,
          totalRides: 0,
          documentsApproved: false,
          activationFeePaid: false,
        };
        await setDoc(doc(db, 'drivers', user.uid), driverProfile);
      }
      
      setScreen(role === 'driver' ? 'driver-home' : 'passenger-home');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col h-full bg-black p-8 justify-center"
    >
      <h2 className="text-3xl font-bold text-white mb-8 text-center italic">I want to...</h2>
      
      <div className="space-y-6">
        <button
          onClick={() => selectRole('passenger')}
          disabled={loading}
          className="w-full bg-[#1A1A1A] p-6 rounded-2xl border border-white/10 flex items-center gap-6 group hover:border-yellow-500/50 transition-colors"
        >
          <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center group-hover:bg-yellow-500/20 transition-colors">
            <User className="text-yellow-500" size={32} />
          </div>
          <div className="text-left">
            <h3 className="text-xl font-bold text-white">Ride</h3>
            <p className="text-gray-400 text-sm">Book safe, reliable trips.</p>
          </div>
        </button>

        <button
          onClick={() => selectRole('driver')}
          disabled={loading}
          className="w-full bg-[#1A1A1A] p-6 rounded-2xl border border-white/10 flex items-center gap-6 group hover:border-yellow-500/50 transition-colors"
        >
          <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center group-hover:bg-yellow-500/20 transition-colors">
            <Car className="text-yellow-500" size={32} />
          </div>
          <div className="text-left">
            <h3 className="text-xl font-bold text-white">Drive</h3>
            <p className="text-gray-400 text-sm">Earn by providing safe rides.</p>
          </div>
        </button>
      </div>

      <div className="mt-12 flex items-center justify-center gap-2">
        <Shield size={14} className="text-yellow-500/50" />
        <p className="text-[10px] text-gray-500 uppercase tracking-widest text-center">
          Background checks required for all drivers
        </p>
      </div>
    </motion.div>
  );
}

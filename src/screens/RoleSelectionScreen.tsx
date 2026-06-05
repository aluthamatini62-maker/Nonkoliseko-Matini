import React from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { User, Car, ShieldCheck } from 'lucide-react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

export default function RoleSelectionScreen() {
  const { user, profile, setScreen } = useApp();

  const handleRoleSelect = async (role: 'passenger' | 'driver') => {
    if (!user) return;
    
    try {
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        displayName: user.displayName || 'User',
        email: user.email || '',
        role: role,
        isVerified: role === 'driver' ? true : false, // Auto-verify for now to keep it simple, or set to false
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp()
      }, { merge: true });
      setScreen(role === 'driver' ? 'driver-home' : 'passenger-home');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col h-full bg-black p-5 justify-between"
    >
      <div className="mt-6 mb-4">
        <h2 className="text-2xl font-bold text-white mb-2 italic">Who are you?</h2>
        <p className="text-gray-400 text-xs font-medium tracking-tight">Choose your role to continue with Kasi Rides SA.</p>
      </div>

      <div className="space-y-4 flex-1 flex flex-col justify-center">
        <button
          onClick={() => handleRoleSelect('passenger')}
          className="w-full bg-[#1A1A1A] border border-white/5 rounded-2xl p-5 flex flex-col items-center gap-3 hover:border-yellow-500/30 transition-all group active:scale-[0.98]"
        >
          <div className="w-14 h-14 rounded-full bg-yellow-500 flex items-center justify-center shadow-2xl group-hover:scale-105 transition-transform">
            <User size={28} className="text-black" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-bold text-white mb-0.5 tracking-tight">Passenger</h3>
            <p className="text-gray-500 text-[10px] font-medium tracking-wide uppercase">I need a ride</p>
          </div>
        </button>

        <button
          onClick={() => handleRoleSelect('driver')}
          className="w-full bg-[#1A1A1A] border border-white/5 rounded-2xl p-5 flex flex-col items-center gap-3 hover:border-yellow-500/30 transition-all group active:scale-[0.98]"
        >
          <div className="w-14 h-14 rounded-full bg-blue-500 flex items-center justify-center shadow-2xl group-hover:scale-105 transition-transform">
            <Car size={28} className="text-white" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-bold text-white mb-0.5 tracking-tight">Driver</h3>
            <p className="text-gray-500 text-[10px] font-medium tracking-wide uppercase">I want to drive</p>
          </div>
        </button>
      </div>

      <div className="mt-auto flex items-center justify-center gap-2 pt-4 mb-4">
        <ShieldCheck size={16} className="text-yellow-500" />
        <span className="text-xs text-gray-500 uppercase tracking-widest font-semibold tracking-tighter">Safety is our Priority</span>
      </div>
    </motion.div>
  );
}

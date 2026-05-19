import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { LogIn, Phone, ShieldCheck } from 'lucide-react';
import { cn } from '../lib/utils';

export default function AuthScreen() {
  const { setScreen } = useApp();
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      // AppContext handles redirection after auth state change
    } catch (error) {
      console.error("Login failed", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col h-full bg-black p-8"
    >
      <div className="mt-12 mb-12">
        <h2 className="text-3xl font-bold text-white mb-2 italic">Get Started</h2>
        <p className="text-gray-400">Professional transport in South Africa, focused on your safety.</p>
      </div>

      <div className="space-y-4 mt-auto mb-12">
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-white text-black font-semibold py-4 rounded-xl flex items-center justify-center gap-3 active:scale-95 transition-transform"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
          {loading ? 'Connecting...' : 'Continue with Google'}
        </button>

        <button
          className="w-full bg-[#1A1A1A] text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-3 border border-white/10 active:scale-95 transition-transform"
        >
          <Phone size={20} className="text-yellow-500" />
          Continue with Phone
        </button>
      </div>

      <div className="flex items-center justify-center gap-2 mb-8">
        <ShieldCheck size={16} className="text-yellow-500" />
        <span className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Verified Safe Drivers Only</span>
      </div>
    </motion.div>
  );
}

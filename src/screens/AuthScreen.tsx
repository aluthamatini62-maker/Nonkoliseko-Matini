import React, { useState } from 'react';
import { motion } from 'framer-motion';
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
      className="flex flex-col h-full bg-black p-6 justify-between relative overflow-hidden"
    >
      <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-[-50px] left-[-50px] w-64 h-64 bg-yellow-500/5 rounded-full blur-3xl" />

      <div className="mt-8 mb-6 relative z-10">
        <h2 className="text-2xl font-bold text-white mb-2 italic">Get Started</h2>
        <p className="text-gray-400 text-xs font-medium">Professional transport in South Africa, focused on your safety.</p>
      </div>

      <div className="space-y-3.5 my-auto relative z-10">
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-white text-black font-semibold py-3.5 rounded-xl flex items-center justify-center gap-3 active:scale-95 transition-transform text-sm"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
          {loading ? 'Connecting...' : 'Continue with Google'}
        </button>

        <button
          className="w-full bg-[#1A1A1A] text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-3 border border-white/10 active:scale-95 transition-transform text-sm"
        >
          <Phone size={18} className="text-yellow-500" />
          Continue with Phone
        </button>
      </div>

      <div className="flex items-center justify-center gap-2 mt-auto mb-4 relative z-10">
        <ShieldCheck size={16} className="text-yellow-500" />
        <span className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Verified Safe Drivers Only</span>
      </div>
    </motion.div>
  );
}

import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { Car } from 'lucide-react';

export default function SplashScreen() {
  const { setScreen, user } = useApp();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!user) {
        setScreen('auth');
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [user, setScreen]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center h-full bg-black relative"
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="mb-8"
      >
        <div className="w-32 h-32 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-3xl flex items-center justify-center shadow-[0_0_50px_rgba(234,179,8,0.3)]">
          <Car size={64} className="text-black" />
        </div>
      </motion.div>
      
      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-4xl font-bold tracking-tighter text-white"
      >
        KWANO <span className="text-yellow-500">RIDES</span>
      </motion.h1>
      
      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-yellow-500/70 text-sm mt-2 tracking-widest uppercase font-medium"
      >
        Your Safe Ride Home
      </motion.p>

      <div className="absolute bottom-12 left-0 right-0 flex justify-center">
        <motion.div
          animate={{ scaleX: [0, 1, 1], opacity: [0, 1, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="h-1 w-24 bg-yellow-500 rounded-full origin-left"
        />
      </div>
    </motion.div>
  );
}

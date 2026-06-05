import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { ShieldAlert, Phone, Share2, Heart, ChevronLeft, MapPin, Loader2, CheckCircle2 } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

export default function SafetyScreen() {
  const { user, profile, setScreen, activeRide } = useApp();
  const [isActivating, setIsActivating] = useState(false);
  const [isActivated, setIsActivated] = useState(false);

  const handlePanic = async () => {
    if (!user) return;
    setIsActivating(true);
    
    const alertData = {
      userId: user.uid,
      rideId: activeRide?.id || null,
      type: 'SOS',
      location: activeRide?.pickup || { lat: -26.2468, lng: 27.9312 }, // Use active ride coords if available, fallback to JHB
      timestamp: serverTimestamp(),
      resolved: false
    };

    try {
      await addDoc(collection(db, 'alerts'), alertData);
      setIsActivated(true);
      // Also potentially call emergency number
      // window.location.href = 'tel:10111';
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'alerts');
    } finally {
      setIsActivating(false);
    }
  };

  const handleBack = () => {
    if (activeRide) {
      setScreen('tracking');
    } else {
      setScreen(profile?.role === 'driver' ? 'driver-home' : 'passenger-home');
    }
  };

  const safetyFeatures = [
    { 
      id: 'emergency', 
      title: 'Emergency Assistance', 
      desc: 'Call local emergency services immediately', 
      icon: Phone, 
      color: 'bg-red-500',
      action: () => window.location.href = 'tel:10111'
    },
    { 
      id: 'contacts', 
      title: 'Trusted Contacts', 
      desc: 'Manage people who get notified of your rides', 
      icon: Heart, 
      color: 'bg-pink-500' 
    },
    { 
      id: 'share', 
      title: 'Share Live Trip', 
      desc: 'Let friends & family track your journey', 
      icon: Share2, 
      color: 'bg-blue-500' 
    },
    { 
      id: 'crisis', 
      title: 'Crisis Support', 
      desc: 'Contact our 24/7 dedicated safety team', 
      icon: ShieldAlert, 
      color: 'bg-yellow-500' 
    },
  ];

  return (
    <div className="h-full bg-black flex flex-col p-6 overflow-y-auto">
      <header className="flex items-center gap-4 mb-10">
        <button onClick={handleBack} className="w-12 h-12 rounded-2xl bg-[#1A1A1A] flex items-center justify-center text-white active:scale-95 transition-all cursor-pointer">
          <ChevronLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl font-black italic tracking-tighter text-white uppercase leading-none">SAFETY<br/><span className="text-yellow-500">CENTER</span></h1>
        </div>
      </header>

      <div className="bg-red-600 rounded-[30px] p-8 mb-10 shadow-2xl shadow-red-600/20 relative overflow-hidden group">
        <div className="absolute top-[-20%] right-[-10%] w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
        <div className="relative z-10">
           <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mb-6">
              <ShieldAlert size={32} className="text-white" />
           </div>
           <h2 className="text-2xl font-black italic tracking-tighter text-white uppercase mb-2">PANIC BUTTON</h2>
           <p className="text-white/80 text-xs font-bold uppercase tracking-widest leading-relaxed">Press in case of immediate danger. This will notify local security and share your location.</p>
           
           <button 
             onClick={handlePanic}
             disabled={isActivating || isActivated}
             className={`w-full font-black py-5 rounded-2xl mt-8 shadow-xl active:scale-95 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2 ${
               isActivated ? 'bg-green-500 text-white' : 'bg-white text-red-600'
             }`}
           >
              {isActivating ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Sending Alert...
                </>
              ) : isActivated ? (
                <>
                  <CheckCircle2 size={18} />
                  Alert Sent
                </>
              ) : (
                'ACTIVATE NOW'
              )}
           </button>
        </div>
      </div>

      <h3 className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] px-2 mb-6">Safety Features</h3>
      
      <div className="space-y-4">
        {safetyFeatures.map((feature) => (
          <button 
            key={feature.id} 
            onClick={feature.action}
            className="w-full bg-[#1A1A1A] border border-white/5 rounded-3xl p-6 flex items-center gap-6 hover:border-white/10 transition-all group text-left active:scale-[0.98]"
          >
            <div className={`w-14 h-14 rounded-2xl ${feature.color} flex items-center justify-center shrink-0 shadow-lg`}>
               <feature.icon size={24} className="text-white" />
            </div>
            <div>
               <h4 className="text-white font-bold text-base tracking-tight mb-1 group-hover:text-yellow-500 transition-colors uppercase italic">{feature.title}</h4>
               <p className="text-gray-500 text-xs font-medium leading-tight">{feature.desc}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-12 p-6 bg-[#1A1A1A] rounded-3xl border border-white/5 border-dashed">
         <div className="flex items-center gap-4 mb-4">
            <MapPin className="text-yellow-500" size={20} />
            <p className="text-white font-bold text-sm tracking-tight">Your Current Location</p>
         </div>
         <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-2">Address</p>
         <p className="text-white font-medium text-xs leading-relaxed">245 Khayelitsha Blvd, Cape Town, 7784</p>
      </div>

      <footer className="mt-10 mb-6 text-center">
         <p className="text-gray-600 font-black uppercase tracking-[0.2em] text-[8px]">Kasi Rides Safety Protocol v1.02</p>
      </footer>
    </div>
  );
}

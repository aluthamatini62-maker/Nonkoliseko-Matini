import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { rideService, RideRequest } from '../services/RideService';
import { Power, MapIcon as MapPin, Navigation, History, Wallet, Bell, ChevronRight, User, ShieldCheck } from 'lucide-react';
import { cn } from '../lib/utils';

export default function DriverHome() {
  const { profile, signOut, setScreen } = useApp();
  const [isOnline, setIsOnline] = useState(false);
  const [earnings, setEarnings] = useState(1240);
  const [rides, setRides] = useState(8);
  const [activeRequest, setActiveRequest] = useState<RideRequest | null>(null);
  const [currentTrip, setCurrentTrip] = useState<RideRequest | null>(null);

  useEffect(() => {
    if (!profile || !isOnline) return;

    // 1. Listen for new requests
    const unsubscribeRequests = rideService.listenByDriver((availableRides) => {
      // Filter out rides that are already accepted by someone
      const pending = availableRides.filter(r => r.status === 'requested');
      if (pending.length > 0 && !currentTrip) {
        setActiveRequest(pending[0]);
      } else {
        setActiveRequest(null);
      }
    });

    // 2. Listen for the drive's own active trip
    const qActive = query(
      collection(db, 'rides'),
      where('driverId', '==', profile.uid),
      where('status', 'in', ['accepted', 'arriving', 'started'])
    );
    const unsubscribeActive = onSnapshot(qActive, (snapshot) => {
      if (!snapshot.empty) {
        setCurrentTrip({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as RideRequest);
        setActiveRequest(null);
      } else {
        setCurrentTrip(null);
      }
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'rides'));

    return () => {
      unsubscribeRequests();
      unsubscribeActive();
    };
  }, [isOnline, profile?.uid, !!currentTrip]);

  const handleAccept = async () => {
    if (!activeRequest || !profile) return;
    await rideService.acceptRide(activeRequest.id!, profile.uid);
    setActiveRequest(null);
  };

  const handleUpdateStatus = async (status: RideRequest['status']) => {
    if (!currentTrip) return;
    await rideService.updateRideStatus(currentTrip.id!, status);
  };

  return (
    <div className="h-full bg-black flex flex-col relative overflow-hidden">
      {/* Header */}
      <div className="p-6 pt-12 flex justify-between items-center bg-[#0A0A0A] border-bottom border-white/5">
        <div className="flex items-center gap-3">
          <div 
            onClick={() => setScreen('admin')}
            className="w-10 h-10 rounded-full bg-yellow-500 flex items-center justify-center text-black font-bold cursor-pointer transition-transform hover:scale-110 active:scale-95"
          >
            {profile?.displayName?.[0]}
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">{profile?.displayName}</h2>
            <div className="flex items-center gap-1">
              <Star rating={4.9} />
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Master Driver</span>
            </div>
          </div>
        </div>
        <button onClick={signOut} className="text-gray-500 hover:text-white transition-colors">
          <Power size={20} />
        </button>
      </div>

      {/* Online Toggle */}
      <div className="p-4 flex justify-center z-10">
        <button 
          onClick={() => setIsOnline(!isOnline)}
          className={cn(
            "flex items-center gap-3 px-8 py-4 rounded-full font-bold uppercase tracking-widest text-xs transition-all duration-500 shadow-2xl",
            isOnline 
              ? "bg-green-500 text-white shadow-green-500/20" 
              : "bg-[#1A1A1A] text-gray-400 shadow-black/50"
          )}
        >
          <div className={cn("w-2 h-2 rounded-full", isOnline ? "bg-white animate-pulse" : "bg-gray-600")} />
          {isOnline ? 'You are Online' : 'Go Online'}
        </button>
      </div>

      {/* Current Trip Overlay */}
      <AnimatePresence>
        {currentTrip && (
          <motion.div 
            initial={{ y: 300 }}
            animate={{ y: 0 }}
            className="absolute bottom-0 left-0 right-0 p-4 z-50 pointer-events-auto"
          >
            <div className="bg-yellow-500 rounded-3xl p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-black/60">Active Trip</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-black animate-pulse" />
                  <span className="text-xs font-bold text-black uppercase">{currentTrip.status === 'accepted' ? 'Accepted' : currentTrip.status}</span>
                </div>
              </div>
              
              <div className="bg-black/10 p-4 rounded-2xl mb-6">
                <div className="flex items-center gap-4 mb-3">
                  <MapPin size={18} className="text-black/40" />
                  <div className="text-sm font-bold text-black truncate">{currentTrip.pickup.address}</div>
                </div>
                <div className="flex items-center gap-4">
                  <Navigation size={18} className="text-black/40" />
                  <div className="text-sm font-bold text-black truncate">{currentTrip.destination.address}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {currentTrip.status === 'accepted' && (
                  <button 
                    onClick={() => handleUpdateStatus('arriving')}
                    className="col-span-2 bg-black text-yellow-500 font-bold py-4 rounded-2xl text-xs uppercase tracking-widest"
                  >
                    I Have Arrived
                  </button>
                )}
                {currentTrip.status === 'arriving' && (
                  <button 
                    onClick={() => handleUpdateStatus('started')}
                    className="col-span-2 bg-black text-yellow-500 font-bold py-4 rounded-2xl text-xs uppercase tracking-widest"
                  >
                    Start Trip
                  </button>
                )}
                {currentTrip.status === 'started' && (
                  <button 
                    onClick={() => handleUpdateStatus('completed')}
                    className="col-span-2 bg-white text-black font-bold py-4 rounded-2xl text-xs uppercase tracking-widest shadow-xl"
                  >
                    Complete Trip (R {currentTrip.price})
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Dashboard */}
      <div className="px-6 grid grid-cols-2 gap-4 mt-4 relative z-10">
        <div className="bg-[#111] p-4 rounded-2xl border border-white/5">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <Wallet size={14} />
            <span className="text-[10px] uppercase font-bold tracking-widest">Earnings</span>
          </div>
          <div className="text-xl font-bold text-white">R {earnings}</div>
        </div>
        <div className="bg-[#111] p-4 rounded-2xl border border-white/5">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <History size={14} />
            <span className="text-[10px] uppercase font-bold tracking-widest">Total Rides</span>
          </div>
          <div className="text-xl font-bold text-white">{rides}</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 px-6 space-y-3 flex-1 relative z-10">
        <h3 className="text-[10px] uppercase font-bold text-gray-500 tracking-widest mb-2">Quick Access</h3>
        {[
          { label: 'Trip History', icon: History },
          { label: 'Earnings Details', icon: Wallet },
          { label: 'Navigation Settings', icon: Navigation },
          { label: 'Driver Documents', icon: ShieldCheck, alert: true },
        ].map((item, idx) => (
          <button key={idx} className="w-full bg-[#111] p-4 rounded-2xl flex items-center justify-between border border-white/5 active:bg-[#1A1A1A] transition-colors">
            <div className="flex items-center gap-4">
              <div className="text-yellow-500/50"><item.icon size={18} /></div>
              <span className="text-sm font-medium text-gray-200">{item.label}</span>
            </div>
            <div className="flex items-center gap-2">
              {item.alert && <div className="w-2 h-2 bg-yellow-500 rounded-full" />}
              <ChevronRight size={16} className="text-gray-700" />
            </div>
          </button>
        ))}
      </div>

      {/* Notification for Incoming Request */}
      <AnimatePresence>
        {activeRequest && (
          <motion.div 
            initial={{ y: 200 }}
            animate={{ y: 0 }}
            exit={{ y: 200 }}
            className="absolute bottom-0 left-0 right-0 p-4 z-50"
          >
            <div className="bg-white rounded-3xl p-6 shadow-[0_0_50px_rgba(255,255,255,0.1)]">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                    <User className="text-black" />
                  </div>
                  <div>
                    <div className="text-black font-bold text-lg">New Passenger</div>
                    <div className="flex items-center gap-1">
                      <Star rating={4.8} color="black" />
                      <span className="text-[10px] font-bold text-gray-500 tracking-widest uppercase">4.8 Rating</span>
                    </div>
                  </div>
                </div>
                <div className="bg-yellow-500 px-3 py-1 rounded-full text-[10px] font-bold text-black uppercase tracking-widest">
                  New Request
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <div className="text-sm text-gray-600 font-medium truncate">{activeRequest.pickup.address}</div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <div className="text-sm text-gray-600 font-medium truncate">{activeRequest.destination.address}</div>
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setActiveRequest(null)}
                  className="flex-1 bg-gray-100 text-gray-500 font-bold py-4 rounded-2xl tracking-widest uppercase text-xs"
                >
                  Reject
                </button>
                <button 
                  onClick={handleAccept}
                  className="flex-[2] bg-black text-yellow-500 font-bold py-4 rounded-2xl tracking-widest uppercase text-xs"
                >
                  Accept R {activeRequest.price}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Star({ rating, color = 'gray' }: { rating: number, color?: string }) {
  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <svg key={i} className={cn("w-2.5 h-2.5 fill-current", i < Math.floor(rating) ? "text-yellow-500" : `text-${color}-300`)} viewBox="0 0 24 24">
          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
        </svg>
      ))}
    </div>
  );
}

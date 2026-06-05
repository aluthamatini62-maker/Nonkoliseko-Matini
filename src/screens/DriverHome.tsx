import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { Power, MapPin, DollarSign, Star, TrendingUp, Bell, Navigation, Settings, Loader2, LogOut, RefreshCw, History, X, ShieldAlert, Sparkles, CreditCard, ShieldCheck, Check } from 'lucide-react';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import MapComponent, { AdvancedMarker } from '../components/MapComponent';

function getHaversineDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function DriverHome() {
  const { user, profile, setActiveRide, setScreen, signOut } = useApp();
  const [isOnline, setIsOnline] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);

  const REGIONS = [
    { name: 'Gauteng (Joburg / Pretoria / Soweto)', lat: -26.2041, lng: 28.0473 },
    { name: 'Western Cape (Cape Town)', lat: -33.9249, lng: 18.4241 },
    { name: 'KwaZulu-Natal (Durban / Umhlanga)', lat: -29.8587, lng: 31.0218 },
    { name: 'Eastern Cape (Gqeberha / PE)', lat: -33.9608, lng: 25.6022 },
    { name: 'Free State (Bloemfontein)', lat: -29.1181, lng: 26.2140 },
  ];
  const [selectedRegion, setSelectedRegion] = useState(REGIONS[0]);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [pastTrips, setPastTrips] = useState<any[]>([]);

  // Onboarding Fees & Fast Track States
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'eft' | 'cash'>('card');
  const [isPaying, setIsPaying] = useState(false);
  const [fastTrackSubmitting, setFastTrackSubmitting] = useState(false);
  const [onboardingToast, setOnboardingToast] = useState('');

  const triggerOnboardingToast = (msg: string) => {
    setOnboardingToast(msg);
    setTimeout(() => {
      setOnboardingToast('');
    }, 3800);
  };

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'rides'),
      where('driverId', '==', user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      docs.sort((a: any, b: any) => {
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        return dateB - dateA;
      });
      setPastTrips(docs);
    }, (error) => {
      console.error("Error monitoring driver trips:", error);
    });
    return () => unsubscribe();
  }, [user]);

  const handleSwitchRole = async (targetRole: 'passenger' | 'driver') => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid), {
        role: targetRole,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setIsMenuOpen(false);
      setScreen(targetRole === 'driver' ? 'driver-home' : 'passenger-home');
    } catch (e) {
      console.error("Error switching role:", e);
    }
  };

  // Live Drivers real GPS coordinate tracking if available, fall back to simulated province offsets
  useEffect(() => {
    if (!user || !profile?.isVerified) return;

    if (!isOnline) {
      // Set offline in database
      const goOffline = async () => {
        try {
          await updateDoc(doc(db, 'users', user.uid), {
            isOnline: false,
            currentLocation: null,
            updatedAt: serverTimestamp()
          });
        } catch (e) {
          console.warn("Error going offline in database", e);
        }
      };
      goOffline();
      return;
    }

    let watchId: number | null = null;

    const startLocationSync = async () => {
      // First, set state and initial fallback position in database
      const fallbackLat = selectedRegion.lat + (Math.random() - 0.5) * 0.015;
      const fallbackLng = selectedRegion.lng + (Math.random() - 0.5) * 0.015;

      try {
        await updateDoc(doc(db, 'users', user.uid), {
          isOnline: true,
          currentLocation: { lat: fallbackLat, lng: fallbackLng },
          updatedAt: serverTimestamp()
        });
      } catch (e) {
        console.warn("Failed establishing initial online status", e);
      }

      // If physical client GPS geolocation matches are activated/authorized in iframe, sync on the fly
      if (navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(
          async (pos) => {
            const { latitude, longitude } = pos.coords;
            try {
              await updateDoc(doc(db, 'users', user.uid), {
                currentLocation: { lat: latitude, lng: longitude },
                updatedAt: serverTimestamp()
              });
            } catch (err) {
              console.warn("Failed syncing real-time GPS position step to Firestore", err);
            }
          },
          (err) => {
            console.log("Using synthetic provincial center offsets as fallback coordinate data", err);
          },
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
      }
    };

    startLocationSync();

    return () => {
      if (watchId !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [isOnline, user, profile?.isVerified, selectedRegion]);

  useEffect(() => {
    if (!isOnline) {
      setRequests([]);
      return;
    }

    const q = query(collection(db, 'rides'), where('status', '==', 'requested'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allRequests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      const filtered = allRequests.filter((req) => {
        if (!req.pickup?.lat || !req.pickup?.lng) return false;
        const dist = getHaversineDistance(selectedRegion.lat, selectedRegion.lng, req.pickup.lat, req.pickup.lng);
        return dist < 120; // Within 120km to keep it strictly localized within the active province boundaries
      });
      setRequests(filtered);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'rides');
    });

    return () => unsubscribe();
  }, [isOnline, selectedRegion]);

  const handleAcceptRide = async (ride: any) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'rides', ride.id), {
        status: 'accepted',
        driverId: user.uid,
        updatedAt: serverTimestamp()
      });
      setActiveRide(ride);
      setScreen('tracking');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rides/${ride.id}`);
    }
  };

  const handlePayActivationFee = async () => {
    if (!user) return;
    setIsPaying(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      await updateDoc(doc(db, 'users', user.uid), {
        activationFeePaid: true,
        updatedAt: serverTimestamp()
      });
      setShowPaymentSheet(false);
      triggerOnboardingToast("R150 activation & vetting fee cleared! Background check in progress.");
    } catch (e) {
      console.error(e);
      triggerOnboardingToast("Failed to clear payment. Please retry.");
    } finally {
      setIsPaying(false);
    }
  };

  const handleFastTrackApproval = async () => {
    if (!user) return;
    setFastTrackSubmitting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1400));
      await updateDoc(doc(db, 'users', user.uid), {
        isVerified: true,
        activationFeePaid: true,
        documentStatus: 'approved',
        updatedAt: serverTimestamp()
      });
      triggerOnboardingToast("Welcome! Your driver profile has been approved in real-time.");
    } catch (e) {
      console.error(e);
      triggerOnboardingToast("Fast-track failed. Try checking Firestore database connectivity.");
    } finally {
      setFastTrackSubmitting(false);
    }
  };

  const stats = [
    { label: 'Today', value: 'R450' },
    { label: 'Rides', value: '12' },
    { label: 'Rating', value: '4.9' }
  ];

  return (
    <div className="h-full bg-black flex flex-col relative overflow-hidden select-none">
      <header className="p-4 flex justify-between items-center relative z-20 shrink-0">
        <div onClick={() => setIsMenuOpen(true)} className="flex items-center gap-2.5 cursor-pointer active:scale-95 transition-all">
          <div className="w-10 h-10 rounded-xl border-2 border-blue-500 overflow-hidden bg-[#222]">
            {profile?.avatar ? (
              <img src={profile.avatar} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-blue-500 font-bold text-xs">
                {profile?.name?.charAt(0) || 'D'}
              </div>
            )}
          </div>
          <div>
            <h2 className="text-white font-bold text-xs tracking-tight">{profile?.name || 'Driver Name'}</h2>
            <div className="flex items-center gap-1">
              {profile?.isVerified ? (
                <>
                  <Star size={8} className="text-[#f5b400] fill-[#f5b400]" />
                  <span className="text-[#f5b400] text-[8px] font-black uppercase">GOLD DRIVER</span>
                </>
              ) : (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                  <span className="text-yellow-500 text-[8px] font-black uppercase">PENDING AUDIT</span>
                </>
              )}
            </div>
          </div>
        </div>
        <button onClick={() => setIsMenuOpen(true)} className="w-10 h-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center text-gray-400 cursor-pointer active:scale-95 transition-transform">
          <Settings size={18} />
        </button>
      </header>

      {profile && !profile.isVerified ? (
        /* DRIVER REGISTRATION & ONBOARDING STATIONS SCREEN */
        <div className="flex-1 overflow-y-auto no-scrollbar px-5 pb-6 pt-2 relative z-10 flex flex-col justify-between font-sans text-left">
          <div className="space-y-4">
            <div className="bg-[#1C1502] border border-[#f5b400]/20 p-4 rounded-2xl text-left shadow-2xl relative overflow-hidden">
              <div className="absolute right-3 top-3 opacity-15">
                <ShieldAlert size={48} className="text-[#f5b400]" />
              </div>
              <h3 className="text-[#f5b400] text-xs font-black uppercase tracking-widest flex items-center gap-1.5 leading-none">
                <Loader2 size={11} className="animate-spin text-[#f5b400]" /> Document Vetting In Progress
              </h3>
              <p className="text-white text-xs font-bold leading-snug mt-2">
                We're checking your Driving License & permit. Vetting takes less than 15 minutes.
              </p>
              <div className="mt-3.5 pt-3 border-t border-white/5 flex justify-between items-center text-[10px] text-gray-400 font-bold">
                <span>Vehicle: <strong className="text-white">{profile.vehicleDetails?.makeModel || 'Toyota Polo'}</strong></span>
                <span>Plate: <strong className="text-white">{profile.vehicleDetails?.plateNumber || 'GP'}</strong></span>
              </div>
            </div>

            {/* Checklist dashboard */}
            <div className="bg-[#121212] border border-white/5 rounded-2xl p-4 text-left">
              <h4 className="text-gray-500 text-[9px] font-black tracking-widest uppercase mb-4 block animate-pulse">Audit Evaluation Checklist</h4>
              
              <div className="space-y-4">
                {/* Step 1: Submit */}
                <div className="flex items-start gap-4">
                  <div className="w-6 h-6 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 flex items-center justify-center text-xs shrink-0 font-black">
                    <Check size={11} className="stroke-[3px]" />
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-white uppercase mt-0.5">Submit Application & Form</h5>
                    <p className="text-gray-500 text-[9.5px] mt-0.5">Primary details parsed successfully.</p>
                  </div>
                </div>

                {/* Step 2: License Review */}
                <div className="flex items-start gap-4">
                  <div className="w-6 h-6 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 flex items-center justify-center text-xs shrink-0 font-black">
                    <Check size={11} className="stroke-[3px]" />
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-white uppercase mt-0.5">S.A. Driving License Audit</h5>
                    <p className="text-gray-500 text-[9.5px] mt-0.5">Vetting cleared: Permit Valid.</p>
                  </div>
                </div>

                {/* Step 3: Background Police Clearance */}
                <div className="flex items-start gap-4">
                  <div className="w-6 h-6 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center text-xs shrink-0 font-black">
                    <Loader2 size={11} className="animate-spin text-blue-400" />
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-white uppercase mt-0.5">Background Safety Clearance</h5>
                    <p className="text-gray-500 text-[9.5px] mt-0.5">Pending Soweto Police Station verification.</p>
                  </div>
                </div>

                {/* Step 4: System Onboarding Fee */}
                <div className="flex items-start gap-4">
                  {profile.activationFeePaid ? (
                    <div className="w-6 h-6 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 flex items-center justify-center text-xs shrink-0 font-black">
                      <Check size={11} className="stroke-[3px]" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-[#1C1502] border border-[#f5b400]/20 text-[#f5b400] flex items-center justify-center text-[10px] shrink-0 font-black">
                      R
                    </div>
                  )}
                  <div>
                    <h5 className="text-xs font-black text-white uppercase mt-0.5">Onboarding Activation Fee</h5>
                    <p className="text-gray-500 text-[9.5px] mt-0.5">
                      {profile.activationFeePaid ? 'Cleared & Approved' : 'Requires once-off vetting activation deposit of R150.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Pay Button / Completed */}
            {!profile.activationFeePaid && (
              <button 
                onClick={() => setShowPaymentSheet(true)}
                className="w-full bg-[#f5b400]/10 border border-[#f5b400]/30 text-[#f5b400] hover:bg-[#f5b400]/20 py-3.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer h-12"
              >
                <CreditCard size={13} />
                <span>Pay Once-off R150 Fee</span>
              </button>
            )}
          </div>

          <div className="mt-8 space-y-3 shrink-0">
            {/* Demo Instant verification */}
            <div className="h-px bg-white/5 my-1" />
            
            <button
              onClick={handleFastTrackApproval}
              disabled={fastTrackSubmitting}
              className="w-full bg-blue-600 text-white font-black py-4 rounded-xl text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/15 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer h-13"
            >
              {fastTrackSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={14} />
                  <span>COMMITTING APPROVAL TO FIRESTORE...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} className="text-white fill-white" />
                  <span>FAST-TRACK APPROVAL (DEMO)</span>
                </>
              )}
            </button>

            <span className="text-[7.5px] text-gray-500 font-extrabold uppercase tracking-widest text-center mt-1 block leading-normal">
              ANY TESTER OR DRIVER CAN FAST-TRACK THE AUDIT PROCESS INSTANTLY FOR TESTING & RIDE EXPERIENCES!
            </span>
          </div>

          {/* Toast Notification overlay */}
          <AnimatePresence>
            {onboardingToast && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute bottom-6 left-5 right-5 z-50 bg-black/95 border border-[#f5b400]/30 rounded-xl p-3 shadow-2xl flex items-center gap-2 pointer-events-none"
              >
                <div className="w-2 h-2 rounded-full bg-[#f5b400] animate-ping shrink-0" />
                <span className="text-[10px] font-black uppercase tracking-wide text-white leading-tight">{onboardingToast}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Payment Sheet Modal */}
          <AnimatePresence>
            {showPaymentSheet && (
              <>
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 0.6 }} 
                  exit={{ opacity: 0 }}
                  onClick={() => setShowPaymentSheet(false)}
                  className="fixed inset-0 bg-black z-40 cursor-pointer"
                />
                <motion.div 
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                  className="absolute bottom-0 left-0 right-0 bg-[#121212] border-t border-white/10 p-5 rounded-t-[25px] z-50 text-left flex flex-col gap-4 select-none"
                >
                  <div className="flex justify-between items-center">
                    <h4 className="text-white font-black italic tracking-tighter text-lg uppercase">Select Activation Method</h4>
                    <button onClick={() => setShowPaymentSheet(false)} className="text-gray-400 hover:text-white p-1">
                      <X size={18} />
                    </button>
                  </div>

                  <p className="text-gray-500 text-[10px] font-medium leading-relaxed">
                    This R150 is held securely. It activates your profile in Soweto/Johannesburg mapping region instantly.
                  </p>

                  <div className="grid grid-cols-3 gap-2">
                    <button 
                      onClick={() => setPaymentMethod('card')}
                      className={`p-3 rounded-lg border text-center flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                        paymentMethod === 'card' ? 'border-[#f5b400] bg-[#f5b400]/5 text-[#f5b400]' : 'border-white/5 bg-black text-gray-500'
                      }`}
                    >
                      <CreditCard size={15} />
                      <span className="text-[8px] font-black uppercase">Card Pay</span>
                    </button>

                    <button 
                      onClick={() => setPaymentMethod('eft')}
                      className={`p-3 rounded-lg border text-center flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                        paymentMethod === 'eft' ? 'border-[#f5b400] bg-[#f5b400]/5 text-[#f5b400]' : 'border-white/5 bg-black text-gray-500'
                      }`}
                    >
                      <TrendingUp size={15} />
                      <span className="text-[8px] font-black uppercase">Instant EFT</span>
                    </button>

                    <button 
                      onClick={() => setPaymentMethod('cash')}
                      className={`p-3 rounded-lg border text-center flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                        paymentMethod === 'cash' ? 'border-[#f5b400] bg-[#f5b400]/5 text-[#f5b400]' : 'border-white/5 bg-black text-gray-500'
                      }`}
                    >
                      <DollarSign size={15} />
                      <span className="text-[8px] font-black uppercase">Cash Token</span>
                    </button>
                  </div>

                  <button
                    onClick={handlePayActivationFee}
                    disabled={isPaying}
                    className="w-full bg-[#f5b400] text-black font-black py-3.5 rounded-xl text-[10px] uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer h-12"
                  >
                    {isPaying ? (
                      <>
                        <Loader2 className="animate-spin" size={13} />
                        <span>PROCESSING R150 DEPOSIT...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={13} />
                        <span>CONFIRM R150 PAYMENT</span>
                      </>
                    )}
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      ) : (
        /* STANDARD APPROVED DRIVER WORK STAGE */
        <>
          <div className="px-4 mt-2 relative z-20 shrink-0 space-y-2">
            {/* Real-time Province Selector */}
            <div className="bg-[#111] border border-white/10 rounded-xl px-3 py-2.5 flex items-center justify-between shadow-lg">
              <span className="text-gray-500 text-[8.5px] font-black tracking-widest uppercase font-sans">Active Region:</span>
              <select 
                value={selectedRegion.name}
                onChange={(e) => {
                  const selected = REGIONS.find(r => r.name === e.target.value) || REGIONS[0];
                  setSelectedRegion(selected);
                }}
                className="bg-transparent border-none text-[#f5b400] text-[10.5px] font-black focus:outline-none cursor-pointer uppercase select-none p-0 text-right font-sans"
              >
                {REGIONS.map((r) => (
                  <option key={r.name} value={r.name} className="bg-black text-white text-xs">{r.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {stats.map((stat) => (
                <div key={stat.label} className="bg-[#1A1A1A] border border-white/5 p-2.5 rounded-2xl flex flex-col items-center">
                  <p className="text-gray-500 text-[8px] font-black uppercase tracking-widest mb-0.5">{stat.label}</p>
                  <p className="text-white font-black italic tracking-tighter text-base">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 relative z-10 flex flex-col items-center justify-center p-4 w-full">
            {/* Real Map Elements */}
            <div className="absolute inset-0 z-0">
              <MapComponent 
                center={{ lat: selectedRegion.lat, lng: selectedRegion.lng }} 
                zoom={12} 
                disableDefaultUI
              >
                {isOnline && requests.map((req) => (
                  req.pickup && (
                    <AdvancedMarker 
                      key={req.id} 
                      position={{ lat: req.pickup.lat, lng: req.pickup.lng }} 
                      type="pickup" 
                    />
                  )
                ))}
              </MapComponent>
              <div className={`absolute inset-0 transition-all duration-700 bg-black/60 ${isOnline ? 'backdrop-blur-[0px] bg-black/30' : 'backdrop-blur-[2px] bg-black/60'}`} />
            </div>

            <motion.button
              onClick={() => setIsOnline(!isOnline)}
              animate={{ 
                scale: isOnline ? 0.95 : 1.0,
                boxShadow: isOnline 
                  ? '0 0 30px rgba(59,130,246,0.25)' 
                  : '0 0 30px rgba(239,68,68,0.15)'
              }}
              transition={{ duration: 1, repeat: Infinity, repeatType: "reverse" }}
              className={`w-32 h-32 rounded-full flex flex-col items-center justify-center gap-3 border-8 ${
                isOnline ? 'bg-blue-500 border-blue-500/20' : 'bg-red-500 border-red-500/20'
              } relative z-20 active:scale-90 transition-transform cursor-pointer`}
            >
              <Power size={36} className="text-white" />
              <span className="text-white font-black uppercase tracking-widest text-[9px] leading-none">
                {isOnline ? 'GOING OFFLINE' : 'GO ONLINE'}
              </span>
            </motion.button>

            <p className="mt-4 text-gray-500 text-[10px] font-black tracking-wider uppercase relative z-20 text-center leading-none">
              {isOnline ? 'Searching for passengers...' : 'Appear as offline'}
            </p>
          </div>

          <div className="p-4 bg-[#1A1A1A] rounded-t-[30px] border-t border-white/5 relative z-20 shrink-0">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp size={14} className="text-blue-500" />
                <h2 className="text-white font-black italic tracking-tight text-base uppercase">EARNINGS TREND</h2>
              </div>
              <button onClick={() => setIsMenuOpen(true)} className="text-gray-500 hover:text-white active:scale-95 transition-all cursor-pointer">
                 <Settings size={16} />
              </button>
            </div>

            <div className="h-24 bg-black/40 rounded-2xl p-3 flex items-end justify-between gap-1.5 border border-white/5">
              {[40, 70, 45, 90, 65, 80, 50].map((h, i) => (
                 <motion.div 
                   key={i}
                   initial={{ height: 0 }}
                   animate={{ height: `${h}%` }}
                   transition={{ delay: i * 0.05 }}
                   className={`w-full rounded-t-lg ${i === 3 ? 'bg-blue-500' : 'bg-blue-500/20'}`}
                 />
              ))}
            </div>

            <div className="mt-2.5 flex justify-between px-1.5 text-[8px] text-gray-500 font-black uppercase tracking-widest">
               <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
            </div>
          </div>
          
          <AnimatePresence>
            {isOnline && requests.length > 0 && (
              <motion.div 
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="absolute bottom-20 left-6 right-6 z-30 bg-blue-600 rounded-[30px] p-6 text-white shadow-2xl text-left"
              >
                <div className="flex justify-between items-center mb-4">
                   <div>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-70">New Request</p>
                      <h3 className="text-xl font-black italic tracking-tighter uppercase">{requests[0].type}</h3>
                   </div>
                   <div className="text-right">
                      <p className="text-2xl font-black italic tracking-tighter">{requests[0].price}</p>
                      <p className="text-[10px] font-black opacity-70">Nearby</p>
                   </div>
                </div>
                <div className="flex items-center gap-3 bg-black/10 rounded-2xl p-4 mb-6">
                   <MapPin size={16} />
                   <p className="text-xs font-bold truncate">{requests[0].pickup?.address || 'Pickup address'}</p>
                </div>
                <button 
                  onClick={() => handleAcceptRide(requests[0])}
                  className="w-full bg-white text-blue-600 font-black py-4 rounded-xl uppercase tracking-widest text-[10px] shadow-lg active:scale-95 transition-transform"
                >
                   Accept Ride
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="absolute inset-0 bg-black z-40 cursor-pointer"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute left-0 top-0 bottom-0 w-4/5 max-w-xs bg-[#121212] border-r border-white/10 z-50 p-6 flex flex-col justify-between overflow-y-auto no-scrollbar"
            >
              <div>
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-white font-black italic tracking-tighter text-2xl uppercase">Kasi Rides Menu</h3>
                  <button onClick={() => setIsMenuOpen(false)} className="text-gray-400 hover:text-white p-1 cursor-pointer">
                    <X size={20} />
                  </button>
                </div>

                {/* Profile Widget */}
                <div className="flex items-center gap-3 bg-white/5 p-4 rounded-2xl border border-white/5 mb-6">
                  <div className="w-12 h-12 rounded-xl border border-blue-500 overflow-hidden bg-[#222] shrink-0">
                    {profile?.avatar ? (
                      <img src={profile.avatar} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-blue-500 font-bold">
                        {profile?.name?.charAt(0) || 'D'}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 text-left">
                    <h4 className="text-white font-black text-sm truncate">{profile?.name || 'Driver'}</h4>
                    <p className="text-gray-500 text-[9px] font-black tracking-widest uppercase mt-0.5">Driver Mode</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-4">
                  <button 
                    onClick={() => handleSwitchRole('passenger')}
                    className="w-full bg-blue-500 text-white font-black py-4 rounded-xl uppercase tracking-widest text-[9px] flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-blue-500/10 cursor-pointer"
                  >
                    <RefreshCw size={12} />
                    Switch to Passenger Mode
                  </button>

                  <div className="h-px bg-white/5 my-4" />

                  {/* Trip history */}
                  <div className="flex items-center gap-2 text-gray-400 mb-2 px-1 text-left">
                    <History size={14} className="text-blue-500" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Provided Rides</span>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1 no-scrollbar text-left">
                    {pastTrips.length === 0 ? (
                      <p className="text-[9px] text-gray-600 uppercase font-black tracking-widest text-center py-4">No rides assigned yet</p>
                    ) : (
                      pastTrips.slice(0, 5).map((trip) => (
                        <div key={trip.id} className="bg-black/40 border border-white/5 p-3 rounded-xl flex justify-between items-center text-left">
                          <div className="truncate pr-2 min-w-0 flex-1">
                            <p className="text-white text-xs font-bold truncate">{trip.destination?.address || 'Trip'}</p>
                            <span className={`text-[8px] uppercase font-black inline-block px-1.5 py-0.5 rounded-full mt-0.5 ${
                              trip.status === 'requested' ? 'bg-yellow-500/10 text-yellow-500' :
                              trip.status === 'accepted' ? 'bg-blue-500/10 text-blue-500' :
                              trip.status === 'completed' ? 'bg-[#f5b400]/10 text-[#f5b400]' :
                              'bg-gray-500/10 text-gray-500'
                            }`}>{trip.status}</span>
                          </div>
                          <span className="text-blue-500 font-mono text-xs font-black shrink-0">{trip.price}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Drawer Sign Out */}
              <div className="pt-6 border-t border-[#1a1a1a]">
                <button 
                  onClick={() => {
                     setIsMenuOpen(false);
                     signOut();
                  }}
                  className="w-full bg-[#1A1A1A] border border-white/5 text-red-500 py-3 rounded-xl font-bold uppercase tracking-widest text-[9px] flex items-center justify-center gap-2 hover:bg-red-500/10 active:scale-95 transition-all cursor-pointer"
                >
                  Sign Out of Account
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

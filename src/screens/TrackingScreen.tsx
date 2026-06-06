import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { ChevronLeft, MessageSquare, Phone, Shield, Navigation2, Star, Clock, X, CheckCircle2, Share2, Loader2, Play, CheckCircle, MapPin, AlertCircle } from 'lucide-react';
import MapComponent, { AdvancedMarker, Pin } from '../components/MapComponent';
import { doc, getDoc, updateDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile } from '../types';

function generateWindingRoute(start: { lat: number; lng: number }, end: { lat: number; lng: number }) {
  const points = [];
  const steps = 32;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const lat = start.lat + (end.lat - start.lat) * t;
    const lng = start.lng + (end.lng - start.lng) * t;
    
    // Smooth curves for scenic visualization
    const wave = Math.sin(t * Math.PI * 2.8);
    const amp = 0.0042 * (1 - Math.pow(2 * t - 1, 2));
    
    points.push({
      lat: lat + (end.lng - start.lng) * wave * amp,
      lng: lng - (end.lat - start.lat) * wave * amp,
    });
  }
  return points;
}

export default function TrackingScreen() {
  const { setScreen, activeRide, setActiveRide, profile } = useApp();
  const [driver, setDriver] = useState<UserProfile | null>(null);
  const [passenger, setPassenger] = useState<UserProfile | null>(null);
  const [timeLeft, setTimeLeft] = useState(4);
  const [loading, setLoading] = useState(true);

  // Driver location (only populated/used if user is driver)
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Real-time Driver Location Tracking Effect
  useEffect(() => {
    if (profile?.role !== 'driver' || !activeRide?.id) return;

    let watchId: number | null = null;
    let fallbackIntervalId: any = null;

    const updateFirestoreLocation = async (lat: number, lng: number) => {
      try {
        await updateDoc(doc(db, 'rides', activeRide.id), {
          driverLocation: {
            lat,
            lng,
            updatedAt: new Date().toISOString()
          }
        });
      } catch (e) {
        console.error("Error updating location in Firestore:", e);
      }
    };

    // Use Web Geolocation API
    if (navigator.geolocation) {
      // 1. Get initial position immediately
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude: lat, longitude: lng } = position.coords;
          setDriverLocation({ lat, lng });
          updateFirestoreLocation(lat, lng);
        },
        (error) => {
          console.error("Initial geolocation retrieval error:", error);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );

      // 2. Setup continuous high-accuracy watch with throttled Firestore updates (low battery drain / low write costs)
      let lastUpdateTime = 0;
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude: lat, longitude: lng } = position.coords;
          setDriverLocation({ lat, lng });

          const now = Date.now();
          // Send updates to database every 12 seconds to prevent drain and stay within quotas
          if (now - lastUpdateTime > 12000) {
            updateFirestoreLocation(lat, lng);
            lastUpdateTime = now;
          }
        },
        (error) => {
          console.error("Geolocation watch process error:", error);
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 10000 }
      );

      // 3. Fallback interval in case watch position is suspended by device OS in background
      fallbackIntervalId = setInterval(() => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude: lat, longitude: lng } = position.coords;
            setDriverLocation({ lat, lng });
            updateFirestoreLocation(lat, lng);
          },
          (error) => {
            console.error("Fallback location retrieval error:", error);
          },
          { enableHighAccuracy: false, timeout: 4000 }
        );
      }, 15000);
    }

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
      if (fallbackIntervalId) {
        clearInterval(fallbackIntervalId);
      }
    };
  }, [profile?.role, activeRide?.id]);

  // Monitor Ride Status changes and fetch associated profiles
  useEffect(() => {
    if (!activeRide?.id) return;

    const unsubscribe = onSnapshot(doc(db, 'rides', activeRide.id), async (snapshot) => {
      const data = snapshot.data();
      if (data) {
        setActiveRide({ id: activeRide.id, ...data });

        // Retrieve driver details (for passenger)
        if (data.driverId) {
          if (data.driverId === 'system_mock_driver') {
            setDriver({
              uid: 'system_mock_driver',
              name: 'Sipho Khumalo',
              phoneNumber: '+27 72 123 4567',
              role: 'driver',
              isVerified: true,
              avatar: ''
            } as any);
          } else if (!driver) {
            try {
              const driverDoc = await getDoc(doc(db, 'users', data.driverId));
              if (driverDoc.exists()) {
                setDriver({ uid: driverDoc.id, ...driverDoc.data() } as UserProfile);
              }
            } catch (e) {
              console.error("Error retrieving driver details:", e);
            }
          }
        }

        // Retrieve passenger details (for driver)
        if (data.passengerId && !passenger) {
          try {
            const passengerDoc = await getDoc(doc(db, 'users', data.passengerId));
            if (passengerDoc.exists()) {
              setPassenger({ uid: passengerDoc.id, ...passengerDoc.data() } as UserProfile);
            }
          } catch (e) {
            console.error("Error retrieving passenger details:", e);
          }
        }
        setLoading(false);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `rides/${activeRide.id}`);
    });

    return () => unsubscribe();
  }, [activeRide?.id]);

  // Handle Driver transitioning ride state machine
  const changeRideStatus = async (newStatus: 'arrived' | 'started' | 'completed') => {
    if (!activeRide?.id) return;
    try {
      const updatePayload: any = {
        status: newStatus,
        updatedAt: serverTimestamp()
      };

      if (newStatus === 'completed') {
        updatePayload.completedAt = serverTimestamp();
      }

      await updateDoc(doc(db, 'rides', activeRide.id), updatePayload);

      if (newStatus === 'completed') {
        // Clear active ride after 3s display of positive status
        setTimeout(() => {
          setActiveRide(null);
          setScreen('driver-home');
        }, 3000);
      }
    } catch (e) {
      console.error("Error transitioning ride status:", e);
    }
  };

  // Automated high-fidelity simulation for a local dev interactive demo!
  useEffect(() => {
    if (profile?.role === 'driver' || !activeRide?.id) return;

    // Phase 1: auto-accept if status is 'requested' after 5 seconds
    if (activeRide.status === 'requested') {
      const timer = setTimeout(async () => {
        try {
          await updateDoc(doc(db, 'rides', activeRide.id), {
            status: 'accepted',
            driverId: 'system_mock_driver',
            driverLocation: {
              lat: -26.2251,
              lng: 27.8612
            },
            updatedAt: serverTimestamp()
          });
        } catch (e) {
          console.error("Error in simulated accept:", e);
        }
      }, 5500);
      return () => clearTimeout(timer);
    }

    // Phase 2 & 3: Simulate movement if the driver is the system_mock_driver
    if (activeRide.driverId === 'system_mock_driver') {
      let intervalId: any = null;

      if (activeRide.status === 'accepted') {
        let step = 0;
        const totalSteps = 8;
        const startLat = activeRide.pickup.lat + 0.014;
        const startLng = activeRide.pickup.lng - 0.011;
        const targetLat = activeRide.pickup.lat;
        const targetLng = activeRide.pickup.lng;

        intervalId = setInterval(async () => {
          step += 1;
          const pct = step / totalSteps;
          const currentLat = startLat + (targetLat - startLat) * pct;
          const currentLng = startLng + (targetLng - startLng) * pct;

          if (step >= totalSteps) {
            clearInterval(intervalId);
            try {
              await updateDoc(doc(db, 'rides', activeRide.id), {
                status: 'arrived',
                driverLocation: { lat: targetLat, lng: targetLng },
                updatedAt: serverTimestamp()
              });
            } catch (e) {
              console.error(e);
            }
          } else {
            try {
              await updateDoc(doc(db, 'rides', activeRide.id), {
                driverLocation: { lat: currentLat, lng: currentLng },
                updatedAt: serverTimestamp()
              });
            } catch (e) {
              console.error(e);
            }
          }
        }, 2200);

      } else if (activeRide.status === 'arrived') {
        // Auto-depart after 4 seconds
        const timer = setTimeout(async () => {
          try {
            await updateDoc(doc(db, 'rides', activeRide.id), {
              status: 'started',
              updatedAt: serverTimestamp()
            });
          } catch (e) {
            console.error(e);
          }
        }, 4000);
        return () => clearTimeout(timer);

      } else if (activeRide.status === 'started') {
        let step = 0;
        const totalSteps = 10;
        const startLat = activeRide.pickup.lat;
        const startLng = activeRide.pickup.lng;
        const targetLat = activeRide.destination.lat; // -26.2576
        const targetLng = activeRide.destination.lng; // 27.9031

        intervalId = setInterval(async () => {
          step += 1;
          const pct = step / totalSteps;
          const currentLat = startLat + (targetLat - startLat) * pct;
          const currentLng = startLng + (targetLng - startLng) * pct;

          if (step >= totalSteps) {
            clearInterval(intervalId);
            try {
              await updateDoc(doc(db, 'rides', activeRide.id), {
                status: 'completed',
                driverLocation: { lat: targetLat, lng: targetLng },
                updatedAt: serverTimestamp()
              });
            } catch (e) {
              console.error(e);
            }
          } else {
            try {
              await updateDoc(doc(db, 'rides', activeRide.id), {
                driverLocation: { lat: currentLat, lng: currentLng },
                updatedAt: serverTimestamp()
              });
            } catch (e) {
              console.error(e);
            }
          }
        }, 2500);
      }

      return () => {
        if (intervalId) clearInterval(intervalId);
      };
    }

  }, [profile?.role, activeRide?.id, activeRide?.status, activeRide?.driverId]);

  // Memoize route array so Leaflet Map component doesn't redraw on every coordinate change render
  const memoizedRoute = React.useMemo(() => {
    if (!activeRide?.pickup || !activeRide?.destination) return [];
    return generateWindingRoute(activeRide.pickup, activeRide.destination);
  }, [activeRide?.pickup?.lat, activeRide?.pickup?.lng, activeRide?.destination?.lat, activeRide?.destination?.lng]);

  if (!activeRide) {
    return (
      <div className="h-full bg-black flex items-center justify-center">
        <Loader2 className="text-yellow-500 animate-spin" size={40} />
      </div>
    );
  }

  const isDriver = profile?.role === 'driver';
  
  // Choose coordinates to focus on (prefer driver location if available, otherwise default to pickup)
  const mapCenter = isDriver
    ? (driverLocation || activeRide.pickup)
    : (activeRide.driverLocation || activeRide.pickup);

  return (
    <div className="h-full bg-black flex flex-col relative overflow-hidden">
      {/* MAP LAYER USING OSM / LEAFLET */}
      <div className="absolute inset-0 z-0">
        <MapComponent 
          center={mapCenter}
          defaultZoom={15} 
          disableDefaultUI
          routeCoordinates={memoizedRoute}
        >
          {/* Pickup Pin */}
          <AdvancedMarker position={activeRide.pickup} type="pickup" />

          {/* Destination Pin */}
          <AdvancedMarker position={activeRide.destination} type="dropoff" />

          {/* Connected live driver marker */}
          {(!isDriver && activeRide.driverLocation) && (
            <AdvancedMarker position={activeRide.driverLocation} type="car" rotation={40} />
          )}

          {/* Local driver marker */}
          {(isDriver && driverLocation) && (
            <AdvancedMarker position={driverLocation} type="car" rotation={135} />
          )}
        </MapComponent>
        <div className="absolute inset-0 bg-black/20 pointer-events-none" />
      </div>

      {/* HEADER BAR */}
      <header className="absolute top-4 left-4 right-4 z-[100] flex justify-between items-center select-none bg-transparent">
        <button 
          onClick={() => setScreen(isDriver ? 'driver-home' : 'passenger-home')} 
          className="w-11 h-11 rounded-2xl bg-[#111111f2] hover:bg-[#1a1a1a] border border-white/10 flex items-center justify-center text-white active:scale-95 transition-all cursor-pointer shadow-xl"
        >
          <ChevronLeft size={20} className="stroke-[2.5px]" />
        </button>
        
        {/* EXACT MAP TOP PILL */}
        <div className="flex items-center justify-center bg-[#555555b3] backdrop-blur border border-white/15 px-4 py-2 rounded-full h-[32px] w-[58px] select-none shadow-xl">
          <div className="w-2.5 h-2.5 rounded-full bg-[#f5b400]" />
        </div>

        <button 
          onClick={() => setScreen(isDriver ? 'driver-home' : 'passenger-home')} 
          className="w-11 h-11 rounded-2xl bg-[#111111f2] hover:bg-[#a32219] border border-white/10 flex items-center justify-center text-[#ff3b30] active:scale-95 transition-all cursor-pointer shadow-xl"
        >
          <X size={20} className="stroke-[2.5px]" />
        </button>
      </header>

      {/* INTERFACE ZONE: STRETCHED OR SLID FROM BOTTOM */}
      <div className="mt-auto relative z-10 bg-[#111111] rounded-t-[30px] px-4 py-5 border-t border-white/5 shadow-2xl shrink-0 select-none">
        <AnimatePresence mode="wait">
          
          {/* RENDER PASSENGER SCREEN ENVIRONMENT */}
          {!isDriver && (
            <motion.div
              key="passenger-view"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
            >
              {activeRide.status === 'completed' ? (
                <div className="text-center py-4">
                  <div className="w-14 h-14 bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center mx-auto mb-3 text-green-500 shadow-lg shadow-green-500/5">
                    <CheckCircle size={28} />
                  </div>
                  <h3 className="text-white font-black italic tracking-tight text-xl uppercase leading-none">TRIP COMPLETED!</h3>
                  <p className="text-gray-400 text-[10px] mt-1.5 font-medium leading-normal">Thank you for riding with Kwano Rides SA. You safely reached your destination.</p>
                  
                  <div className="bg-black/30 border border-white/5 py-2 px-5 rounded-xl my-4 inline-block font-mono text-lg font-bold text-yellow-500 leading-none">
                    Paid: {activeRide.price}
                  </div>

                  <button 
                    onClick={() => {
                      setActiveRide(null);
                      setScreen('passenger-home');
                    }}
                    className="w-full bg-yellow-500 text-black font-black uppercase tracking-widest text-[9px] py-3.5 rounded-xl cursor-pointer active:scale-95 transition-all"
                  >
                    Back to Home Screen
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-4 select-none">
                    <div className="flex items-center gap-3">
                      {/* Avatar / Circle Badging */}
                      <div className="w-[52px] h-[52px] rounded-full ring-2 ring-[#f5b400]/80 bg-gradient-to-br from-[#121212] to-[#1c1c1c] flex items-center justify-center shadow-lg font-black text-[#f5b400] text-xl shrink-0 overflow-hidden">
                        {driver?.avatar ? (
                          <img src={driver.avatar} alt="Driver" className="w-full h-full object-cover" />
                        ) : (
                          <span>{driver?.name?.charAt(0) || 'D'}</span>
                        )}
                      </div>
                      <div className="text-left font-sans">
                        <h3 className="text-white font-black text-lg tracking-tight truncate uppercase leading-tight">
                          {activeRide.status === 'requested' ? 'SEARCHING...' : (driver?.name || 'SEARCHING...')}
                        </h3>
                        <div className="flex items-center gap-1 mt-1">
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map(s => (
                              <Star key={s} size={9} className="text-[#f5b400] fill-[#f5b400]" />
                            ))}
                          </div>
                          <span className="text-gray-400 text-[8px] font-extrabold tracking-widest uppercase ml-1 pt-[1px] leading-none">
                            4.9 • GOLD PARTNER
                          </span>
                        </div>
                      </div>
                    </div>
                    {/* Clock Status Capsule Indicator */}
                    <div className="text-center font-sans">
                      <div className="bg-[#f5b400] w-[64px] h-[32px] rounded-xl flex items-center justify-center text-black active:scale-95 transition-all shadow shadow-yellow-500/20">
                        <Clock size={14} className="fill-black text-black stroke-[2.5px]" />
                      </div>
                      <p className="text-gray-400 text-[8px] font-bold tracking-widest uppercase block text-center mt-1.5 leading-none">
                        STATUS INDICATOR
                      </p>
                    </div>
                  </div>

                  {/* VEHICLE INFO CARD */}
                  <div className="bg-[#121212] rounded-2xl border border-white/5 p-3 flex justify-between items-center w-full mb-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-[#1c1c1c] flex items-center justify-center text-xl shrink-0">
                        <span className="filter saturate-150">🚗</span>
                      </div>
                      <div className="min-w-0 text-left font-sans">
                        <p className="text-white font-black text-sm tracking-tight uppercase truncate leading-tight">TOYOTA AVANZA</p>
                        <p className="text-[#f5b400] font-bold text-[10px] tracking-widest uppercase font-mono mt-1 leading-none">KDN 452 GP</p>
                      </div>
                    </div>
                    <div className="w-[1.2px] h-8 bg-white/10 mx-2.5 shrink-0" />
                    <div className="text-center shrink-0 w-20 font-sans">
                      <p className="text-gray-500 text-[8px] font-black uppercase tracking-widest mb-1 leading-none">VEHICLE COLOR</p>
                      <p className="text-white font-bold text-xs uppercase leading-none">SILVER</p>
                    </div>
                  </div>

                  {/* Actions Drawer Bar matching second screenshot */}
                  <div className="grid grid-cols-4 gap-2.5">
                    <button className="bg-[#1a1a1a] hover:bg-[#222] rounded-2xl py-3 flex flex-col items-center justify-center gap-1 active:scale-95 transition-all border border-white/5 text-white w-full cursor-pointer leading-none">
                      <MessageSquare size={15} className="text-white" />
                      <span className="text-[8px] font-black uppercase tracking-widest text-[#999] mt-0.5">CHAT</span>
                    </button>
                    <button 
                      onClick={() => {
                        const num = driver?.phoneNumber || '';
                        if (num) window.open(`tel:${num}`, '_self');
                      }}
                      className="bg-[#1a1a1a] hover:bg-[#222] rounded-2xl py-3 flex flex-col items-center justify-center gap-1 active:scale-95 transition-all border border-white/5 text-white w-full cursor-pointer leading-none"
                    >
                      <Phone size={15} className="text-white" />
                      <span className="text-[8px] font-black uppercase tracking-widest text-[#999] mt-0.5">CALL</span>
                    </button>
                    <button className="bg-blue-600 hover:bg-blue-500 rounded-2xl py-3 flex flex-col items-center justify-center gap-1 active:scale-95 transition-all text-white w-full cursor-pointer shadow-lg shadow-blue-600/15 leading-none">
                      <Share2 size={15} className="text-white" />
                      <span className="text-[8px] font-black uppercase tracking-widest text-white/90 mt-0.5">SHARE</span>
                    </button>
                    <button onClick={() => setScreen('safety')} className="bg-[#ff3b30] hover:bg-red-500 rounded-2xl py-3 flex flex-col items-center justify-center gap-1 active:scale-95 transition-all text-white w-full cursor-pointer shadow-lg shadow-red-600/15 leading-none">
                      <Shield size={15} className="text-white" />
                      <span className="text-[8px] font-black uppercase tracking-widest text-white/90 mt-0.5">SOS</span>
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* RENDER DRIVER SCREEN ENVIRONMENT */}
          {isDriver && (
            <motion.div
              key="driver-view"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
            >
              {activeRide.status === 'completed' ? (
                <div className="text-center py-4">
                  <div className="w-14 h-14 bg-blue-500/10 border border-blue-500/30 rounded-full flex items-center justify-center mx-auto mb-3 text-blue-500 shadow-lg shadow-blue-500/5">
                    <CheckCircle size={28} />
                  </div>
                  <h3 className="text-white font-black italic tracking-tight text-xl uppercase leading-none">TRIP COMPLETED</h3>
                  <p className="text-gray-400 text-[10px] mt-1.5 font-medium leading-normal">Exceptional service! The amount is successfully credited.</p>
                  
                  <div className="bg-black/30 border border-white/5 py-2.5 px-6 rounded-xl my-4 inline-block">
                    <p className="text-gray-500 text-[8px] font-black uppercase tracking-widest mb-1 text-center">EARNINGS CREDIT</p>
                    <span className="font-mono text-xl font-black text-blue-500">{activeRide.price}</span>
                  </div>
                  
                  <p className="text-[8px] text-gray-500 uppercase tracking-widest font-black animate-pulse leading-none">Relinking to dispatcher...</p>
                </div>
              ) : (
                <>
                  {/* Passenger identification info */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-[#222] border-2 border-blue-500 shrink-0">
                        {passenger?.avatar ? (
                          <img src={passenger.avatar} alt="Passenger" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-blue-500 font-bold uppercase text-base">
                            {passenger?.name?.charAt(0) || 'P'}
                          </div>
                        )}
                      </div>
                      <div className="text-left">
                        <span className="text-blue-500 text-[8px] font-black uppercase tracking-widest leading-none block">Active Customer</span>
                        <h3 className="text-white font-black italic text-lg tracking-tighter uppercase leading-none mt-1">
                          {passenger?.name || 'Customer'}
                        </h3>
                        <p className="text-gray-500 text-[9px] mt-1 font-bold">Payment Option: <span className="text-white uppercase font-black">{activeRide.paymentMethod || 'Cash'}</span></p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-500 text-[8px] font-black uppercase tracking-widest mb-0.5 leading-none">TOTAL FARE</p>
                      <span className="text-blue-500 font-mono text-xl font-black italic tracking-tighter block leading-none">{activeRide.price}</span>
                    </div>
                  </div>

                  {/* Route progress indicator widget */}
                  <div className="bg-black/40 rounded-2xl p-3.5 border border-white/5 mb-4 space-y-3">
                    <div className="flex gap-2.5 items-start">
                      <div className="p-0.5 px-1 bg-blue-500/10 border border-blue-500/20 rounded text-blue-500 text-[8px] font-black mt-0.5 shrink-0 leading-none">A</div>
                      <div className="min-w-0 text-left">
                        <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest block leading-none">PICKUP ADDRESS</span>
                        <p className="text-white text-xs font-bold truncate mt-1 leading-none">{activeRide.pickup.address}</p>
                      </div>
                    </div>
                    
                    <div className="h-px bg-white/5" />

                    <div className="flex gap-2.5 items-start">
                      <div className="p-0.5 px-1 bg-yellow-500/10 border border-yellow-500/20 rounded text-yellow-500 text-[8px] font-black mt-0.5 shrink-0 leading-none">B</div>
                      <div className="min-w-0 text-left">
                        <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest block leading-none">DESTINATION ADDRESS</span>
                        <p className="text-white text-xs font-bold truncate mt-1 leading-none">{activeRide.destination.address}</p>
                      </div>
                    </div>
                  </div>

                  {/* STATE ACTION DISPATCH BUTTONS */}
                  <div className="space-y-3.5">
                    {activeRide.status === 'accepted' && (
                      <button 
                        onClick={() => changeRideStatus('arrived')}
                        className="w-full bg-blue-500 text-white font-black py-3.5 rounded-xl uppercase tracking-widest text-[10px] flex items-center justify-center gap-2.5 active:scale-[0.98] transition-transform shadow-lg shadow-blue-500/10 cursor-pointer"
                      >
                        <CheckCircle size={15} />
                        I HAVE ARRIVED AT PICKUP
                      </button>
                    )}

                    {activeRide.status === 'arrived' && (
                      <button 
                        onClick={() => changeRideStatus('started')}
                        className="w-full bg-yellow-500 text-black font-black py-3.5 rounded-xl uppercase tracking-widest text-[10px] flex items-center justify-center gap-2.5 active:scale-[0.98] transition-transform shadow-lg shadow-yellow-500/10 cursor-pointer"
                      >
                        <Play size={15} className="fill-current" />
                        START THE TRIP / DEPART
                      </button>
                    )}

                    {activeRide.status === 'started' && (
                      <button 
                        onClick={() => changeRideStatus('completed')}
                        className="w-full bg-green-500 text-white font-black py-3.5 rounded-xl uppercase tracking-widest text-[10px] flex items-center justify-center gap-2.5 active:scale-[0.98] transition-transform shadow-lg shadow-green-500/15 cursor-pointer"
                      >
                        <CheckCircle size={15} />
                        COMPLETE THE TRIP / CONCLUDE
                      </button>
                    )}

                    {/* Safety SOS option for Driver */}
                    <div className="grid grid-cols-3 gap-2">
                      <button 
                        onClick={() => {
                          const num = passenger?.phoneNumber || '';
                          window.open(`tel:${num}`, '_self');
                        }}
                        className="bg-[#222] rounded-xl py-2.5 border border-white/5 text-gray-400 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all uppercase text-[7.5px] font-black tracking-widest"
                      >
                        <Phone size={12} />
                        Call Client
                      </button>
                      
                      <button 
                        className="bg-[#222] rounded-xl py-2.5 border border-white/5 text-gray-400 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all uppercase text-[7.5px] font-black tracking-widest"
                      >
                        <MessageSquare size={12} />
                        Chat System
                      </button>

                      <button 
                        onClick={() => setScreen('safety')}
                        className="bg-red-500/10 border border-red-500/20 rounded-xl py-2.5 text-red-500 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all uppercase text-[7.5px] font-black tracking-widest"
                      >
                        <Shield size={12} />
                        SOS Safety
                      </button>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}

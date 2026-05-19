import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { ChevronLeft, Shield, Phone, MessageSquare, MapPin, Clock, Car, Star } from 'lucide-react';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';

import { rideService, RideRequest } from '../services/RideService';

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';

export default function TrackingScreen() {
  const { setScreen, activeRide, setActiveRide } = useApp();
  const [rideDetails, setRideDetails] = useState<RideRequest | null>(null);
  const [eta, setEta] = useState(5);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!activeRide?.id) return;

    const unsubscribe = rideService.listenToRide(activeRide.id, (ride) => {
      if (ride) {
        setRideDetails(ride);
        setActiveRide(ride); // Sync back to context
      } else {
        // Ride deleted?
        setScreen('passenger-home');
      }
    });

    return () => unsubscribe();
  }, [activeRide?.id]);

  return (
    <div className="h-full bg-black flex flex-col overflow-hidden">
      {/* Map Header */}
      <div className="h-2/3 relative">
        <APIProvider apiKey={API_KEY} version="weekly">
           <Map
            defaultCenter={{ lat: -26.2041, lng: 28.0473 }}
            defaultZoom={15}
            mapId="TRACKING_MAP"
            disableDefaultUI={true}
            style={{ width: '100%', height: '100%' }}
          >
            {/* Passenger Location */}
            <AdvancedMarker position={{ lat: -26.2041, lng: 28.0473 }}>
              <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-xl" />
            </AdvancedMarker>

            {/* Simulating Moving Driver */}
            <AdvancedMarker position={{ 
              lat: -26.2041 - (0.005 * (1 - progress)), 
              lng: 28.0473 - (0.005 * (1 - progress)) 
            }}>
               <div className="relative">
                 <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-yellow-500 text-black text-[10px] font-bold px-2 py-1 rounded whitespace-nowrap uppercase tracking-widest">
                    Your Driver
                 </div>
                 <Car size={32} className="text-yellow-500 bg-black p-1 rounded-full border border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.4)]" />
               </div>
            </AdvancedMarker>
          </Map>
        </APIProvider>

        <button 
          onClick={() => setScreen('passenger-home')}
          className="absolute top-6 left-4 bg-black/80 p-3 rounded-full border border-white/10 z-10"
        >
          <ChevronLeft size={24} className="text-white" />
        </button>

        <div className="absolute top-6 right-4 bg-black/80 px-4 py-2 rounded-full border border-white/10 z-10 flex items-center gap-2">
           <Shield size={16} className="text-yellow-500 animate-pulse" />
           <span className="text-[10px] font-bold uppercase tracking-widest text-white">Live Monitoring Active</span>
        </div>
      </div>

      {/* Info Panel */}
      <motion.div 
        initial={{ y: 200 }}
        animate={{ y: 0 }}
        className="flex-1 bg-black p-6 border-t border-white/10 z-20"
      >
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Clock size={16} className="text-yellow-500" />
              <span className="text-2xl font-black italic text-white tracking-tighter">
                {rideDetails?.status === 'requested' ? 'Searching for Driver...' : 
                 rideDetails?.status === 'accepted' ? 'Driver Accepted' :
                 rideDetails?.status === 'arriving' ? 'Driver is Arriving' :
                 'In Transit'}
              </span>
            </div>
            <p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">
              {rideDetails?.status === 'requested' ? 'Waiting for confirmation' : `Arriving in ${eta} min`}
            </p>
          </div>
          <div className="flex gap-3">
             <button className="bg-[#1A1A1A] p-3 rounded-2xl border border-white/5 hover:border-yellow-500/30 transition-colors">
               <Phone size={20} className="text-yellow-500" />
             </button>
             <button className="bg-[#1A1A1A] p-3 rounded-2xl border border-white/5 hover:border-yellow-500/30 transition-colors">
               <MessageSquare size={20} className="text-yellow-500" />
             </button>
          </div>
        </div>

        {rideDetails?.driverId ? (
          <div className="flex items-center justify-between bg-[#111] p-4 rounded-2xl border border-white/5 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-yellow-400 flex items-center justify-center p-0.5 shadow-[0_0_15px_rgba(234,179,8,0.2)]">
                  <img 
                    src="https://picsum.photos/seed/driver/200" 
                    className="w-full h-full rounded-full object-cover grayscale brightness-110" 
                    alt="Driver" 
                    referrerPolicy="no-referrer"
                  />
              </div>
              <div>
                <div className="text-white font-bold tracking-tight">Driver Assigned</div>
                <div className="flex items-center gap-1">
                  <Star size={10} className="text-yellow-500 fill-current" />
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">4.9 • Verified</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-white font-black italic tracking-tighter">NP 12345 GP</div>
              <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Toyota Corolla</div>
            </div>
          </div>
        ) : (
          <div className="bg-[#111] p-6 rounded-2xl border border-white/5 mb-6 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-full border-2 border-yellow-500 border-t-transparent animate-spin mb-4" />
            <span className="text-gray-400 text-sm font-medium">Looking for nearby drivers...</span>
          </div>
        )}

        <button 
          onClick={() => setScreen('safety')}
          className="w-full bg-[#1A1A1A] border border-red-500/30 py-4 rounded-2xl flex items-center justify-center gap-3 active:bg-red-900/20 transition-colors group"
        >
          <Shield size={20} className="text-red-500" />
          <span className="text-xs font-bold text-red-500 uppercase tracking-widest group-active:animate-pulse">Safety Emergency?</span>
        </button>
      </motion.div>
    </div>
  );
}

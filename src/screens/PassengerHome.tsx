import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { APIProvider, Map, AdvancedMarker, Pin, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { useApp } from '../context/AppContext';
import { rideService, Location } from '../services/RideService';
import { Search, MapPin, Navigation, Menu, Shield, Star, Car, LogOut } from 'lucide-react';
import { cn } from '../lib/utils';

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

export default function PassengerHome() {
  const { profile, signOut, setScreen, setActiveRide } = useApp();
  const [searchFocused, setSearchFocused] = useState(false);
  const [destination, setDestination] = useState('');

  const [requesting, setRequesting] = useState(false);

  const handleRequestRide = async () => {
    if (!profile) return;
    setRequesting(true);
    try {
      const rideId = await rideService.requestRide({
        passengerId: profile.uid,
        pickup: { address: 'Current Location', lat: -26.2041, lng: 28.0473 },
        destination: { address: destination || 'Sandton City', lat: -26.1076, lng: 28.0567 },
        price: 55,
        paymentMethod: 'cash'
      });
      
      if (rideId) {
        setActiveRide({
          id: rideId,
          status: 'requested',
        });
        setScreen('tracking');
      }
    } catch (error) {
      console.error("Ride request failed:", error);
    } finally {
      setRequesting(false);
    }
  };

  if (!hasValidKey) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-black">
        <Shield size={48} className="text-yellow-500 mb-4" />
        <h2 className="text-xl font-bold mb-4">Maps Configuration Required</h2>
        <p className="text-sm text-gray-400 mb-8">
          To enable the professional map interface, please add your Google Maps API Key to the project secrets.
        </p>
        <div className="bg-[#1A1A1A] p-4 rounded-xl text-left text-xs text-gray-300 w-full font-mono">
          <p>1. Open Settings (⚙️ icon)</p>
          <p>2. Go to Secrets</p>
          <p>3. Add GOOGLE_MAPS_PLATFORM_KEY</p>
        </div>
        <button 
          onClick={() => setScreen('safety')} 
          className="mt-8 text-yellow-500 font-bold uppercase tracking-widest text-xs"
        >
          View Safety Guidelines instead
        </button>
      </div>
    );
  }

  return (
    <div className="h-full relative flex flex-col">
      <APIProvider apiKey={API_KEY} version="weekly">
        <div className="flex-1 relative">
          <Map
            defaultCenter={{ lat: -26.2041, lng: 28.0473 }} // JHB
            defaultZoom={13}
            mapId="KWANO_PASSENGER_MAP"
            disableDefaultUI={true}
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            style={{ width: '100%', height: '100%' }}
          >
            {/* Fake Nearby Drivers */}
            <AdvancedMarker position={{ lat: -26.205, lng: 28.048 }}>
               <Car size={32} className="text-yellow-500 bg-black/80 p-1 rounded-full border border-yellow-500/50" />
            </AdvancedMarker>
            <AdvancedMarker position={{ lat: -26.202, lng: 28.045 }}>
               <Car size={32} className="text-yellow-500 bg-black/80 p-1 rounded-full border border-yellow-500/50" />
            </AdvancedMarker>
          </Map>

          {/* Top Overlay */}
          <div className="absolute top-6 left-4 right-4 flex justify-between items-center z-10">
            <button 
              onClick={signOut}
              className="bg-black/80 p-3 rounded-full border border-white/10 shadow-xl"
            >
              <Menu size={24} className="text-white" />
            </button>
            <div className="bg-black/80 px-4 py-2 rounded-full border border-white/10 shadow-xl flex items-center gap-2">
              <Shield size={16} className="text-yellow-500" />
              <span className="text-xs font-bold text-white tracking-widest uppercase">Safe Mode</span>
            </div>
          </div>
        </div>

        {/* Bottom Panel */}
        <motion.div 
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="bg-black border-t border-white/10 p-6 z-20 pb-12"
        >
          <div className="flex items-center gap-2 mb-6">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Where are we going, {profile?.displayName?.split(' ')[0]}?</span>
          </div>

          <div className="relative group mb-6">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-yellow-500">
              <Search size={20} />
            </div>
            <input 
              type="text"
              placeholder="Search destination"
              className="w-full bg-[#1A1A1A] border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-yellow-500/50 transition-colors"
              onClick={() => setSearchFocused(true)}
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            />
          </div>

          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
            {[
              { label: 'Kwano Mini', price: 'R45', icon: Car },
              { label: 'Kwano Safe', price: 'R65', icon: Shield },
              { label: 'Kwano Go', price: 'R55', icon: Star },
            ].map((ride, idx) => (
              <button key={idx} className="flex-shrink-0 bg-[#1A1A1A] border border-white/5 p-4 rounded-2xl w-32 group hover:border-yellow-500/50 transition-all">
                <ride.icon className="text-gray-400 mb-2 group-hover:text-yellow-500" size={24} />
                <div className="text-xs font-bold text-white mb-1">{ride.label}</div>
                <div className="text-[10px] text-gray-500">{ride.price}</div>
              </button>
            ))}
          </div>

          <button 
            onClick={handleRequestRide}
            disabled={requesting}
            className={cn(
              "w-full bg-yellow-500 text-black font-bold py-4 rounded-2xl mt-6 active:scale-95 transition-transform shadow-[0_0_30px_rgba(234,179,8,0.2)]",
              requesting && "opacity-50 cursor-not-allowed"
            )}
          >
            {requesting ? 'REQUESTING...' : 'REQUEST KWANO RIDE'}
          </button>
        </motion.div>
      </APIProvider>
    </div>
  );
}

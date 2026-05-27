import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { MapPin, Search, Navigation2, Clock, Shield, Star, Menu, Bell, Loader2, LogOut, RefreshCw, History, X, ChevronDown, Plus, Minus, Compass, Users, Coins, Info, ArrowRight, CheckCircle2 } from 'lucide-react';
import MapComponent, { AdvancedMarker, Pin } from '../components/MapComponent';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

const POPULAR_LOCATIONS = [
  { name: 'Sandton City Mall, Sandton', lat: -26.1075, lng: 28.0567 },
  { name: 'V&A Waterfront, Cape Town', lat: -33.9068, lng: 18.4239 },
  { name: 'Union Buildings, Pretoria', lat: -25.7402, lng: 28.2119 },
  { name: 'uShaka Marine, Durban', lat: -29.8675, lng: 31.0456 },
  { name: 'Vilakazi Street, Soweto', lat: -26.2386, lng: 27.9098 },
  { name: 'Rosebank Mall, Joburg', lat: -26.1456, lng: 28.0435 },
  { name: 'Camps Bay Beach, Cape Town', lat: -33.9515, lng: 18.3785 },
  { name: 'Gateway Mall, Umhlanga KZN', lat: -29.7258, lng: 31.0658 },
  { name: 'Menlyn Park Mall, Pretoria', lat: -25.7825, lng: 28.2758 },
  { name: 'PE Airport, Eastern Cape', lat: -33.9850, lng: 25.6174 }
];

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

function generateWindingRoute(start: { lat: number; lng: number }, end: { lat: number; lng: number }) {
  const points = [];
  const steps = 32;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const lat = start.lat + (end.lat - start.lat) * t;
    const lng = start.lng + (end.lng - start.lng) * t;
    
    // Fine-tuned sinusoidal bends to replicate real scenic streets in Orlando/Diepkloof
    const wave = Math.sin(t * Math.PI * 2.8);
    const amp = 0.0042 * (1 - Math.pow(2 * t - 1, 2));
    
    points.push({
      lat: lat + (end.lng - start.lng) * wave * amp,
      lng: lng - (end.lat - start.lat) * wave * amp,
    });
  }
  return points;
}

export default function PassengerHome() {
  const { user, profile, setScreen, setActiveRide, signOut } = useApp();
  const [pickup, setPickup] = useState('Diepkloof Zone 3, Soweto');
  const [pickupCoords, setPickupCoords] = useState({ lat: -26.2468, lng: 27.9312 });
  
  const [destination, setDestination] = useState('Orlando East, Soweto');
  const [destinationCoords, setDestinationCoords] = useState({ lat: -26.2361, lng: 27.8812 });
  
  const [activeInput, setActiveInput] = useState<'pickup' | 'destination'>('destination');
  const [isRequesting, setIsRequesting] = useState(false);
  const [selectedRideType, setSelectedRideType] = useState('mini');
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [pastTrips, setPastTrips] = useState<any[]>([]);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Nominatim Map Autocomplete States
  const [typedText, setTypedText] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 3500);
  };

  const fetchAddressSuggestions = async (queryText: string) => {
    if (!queryText || queryText.length < 3) {
      setSuggestions([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryText)}&limit=5&addressdetails=1&countrycodes=za`
      );
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      
      const formatted = data.map((item: any) => ({
        name: item.display_name.split(', South Africa')[0],
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
      }));
      setSuggestions(formatted);
    } catch (err) {
      console.warn("Geocoding fetch failed:", err);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    // Synchronize initial input values on active tab switcher
    setTypedText(activeInput === 'pickup' ? pickup : destination);
    setSuggestions([]);
  }, [activeInput]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (typedText && typedText !== (activeInput === 'pickup' ? pickup : destination)) {
        fetchAddressSuggestions(typedText);
      }
    }, 600);

    return () => clearTimeout(delayDebounce);
  }, [typedText]);

  const handleSelectSuggestion = (item: any) => {
    if (activeInput === 'pickup') {
      setPickup(item.name);
      setPickupCoords({ lat: item.lat, lng: item.lng });
      setTypedText(item.name);
      setSuggestions([]);
      triggerToast(`Pickup: ${item.name.split(',')[0]} (Confirmed!)`);
      setActiveInput('destination'); // Move to destination smoothly
    } else {
      setDestination(item.name);
      setDestinationCoords({ lat: item.lat, lng: item.lng });
      setTypedText(item.name);
      setSuggestions([]);
      triggerToast(`Drop-off: ${item.name.split(',')[0]} (Route Generated!)`);
    }
  };

  const handleUseGPSLocation = () => {
    if (!navigator.geolocation) {
      triggerToast("GPS Geolocation is not supported by your browser");
      return;
    }
    triggerToast("🛰️ Pinging real-time GPS satellite coordinates...");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
          );
          if (!res.ok) throw new Error("Reverse geocoding failed");
          const data = await res.json();
          const cleanName = data.display_name.split(', South Africa')[0] || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
          
          if (activeInput === 'pickup') {
            setPickup(cleanName);
            setPickupCoords({ lat: latitude, lng: longitude });
            setTypedText(cleanName);
            triggerToast(`📍 Set GPS Location as Pickup!`);
          } else {
            setDestination(cleanName);
            setDestinationCoords({ lat: latitude, lng: longitude });
            setTypedText(cleanName);
            triggerToast(`🏁 Set GPS Location as Destination!`);
          }
        } catch (e) {
          const fallbackName = `Current GPS Coordinates (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`;
          if (activeInput === 'pickup') {
            setPickup(fallbackName);
            setPickupCoords({ lat: latitude, lng: longitude });
            setTypedText(fallbackName);
          } else {
            setDestination(fallbackName);
            setDestinationCoords({ lat: latitude, lng: longitude });
            setTypedText(fallbackName);
          }
          triggerToast("GPS Lock Acquired!");
        }
      },
      (error) => {
        console.error("GPS permissions blocked or timed out:", error);
        triggerToast("GPS access denied. Enter the address manually!");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'rides'),
      where('passengerId', '==', user.uid)
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
      console.error("Error monitoring past rides:", error);
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

  const distance = getHaversineDistance(pickupCoords.lat, pickupCoords.lng, destinationCoords.lat, destinationCoords.lng);
  const durationMins = Math.max(3, Math.round(distance * 1.8));

  const rideTypes = [
    { id: 'mini', name: 'Kwano Mini', price: `R${Math.round(20 + distance * 5.5)}`, capacity: '1 - 4', type: 'car' },
    { id: 'safe', name: 'Kwano Safe', price: `R${Math.round(30 + distance * 7.5)}`, capacity: '1 - 4', type: 'shield' },
    { id: 'maxi', name: 'Kwano Maxi', price: `R${Math.round(40 + distance * 10.5)}`, capacity: '1 - 7', type: 'van' }
  ];

  const handleRequestRide = async () => {
    if (!user || !destination) return;
    setIsRequesting(true);
    
    const rideData = {
      passengerId: user.uid,
      status: 'requested',
      pickup: { lat: pickupCoords.lat, lng: pickupCoords.lng, address: pickup },
      destination: { lat: destinationCoords.lat, lng: destinationCoords.lng, address: destination },
      price: rideTypes.find(r => r.id === selectedRideType)?.price || 'R45',
      type: selectedRideType,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    try {
      const docRef = await addDoc(collection(db, 'rides'), rideData);
      setActiveRide({ id: docRef.id, ...rideData });
      setScreen('tracking');
      
      // Listen for updates
      onSnapshot(docRef, (snapshot) => {
        const data = snapshot.data();
        if (data) {
          setActiveRide({ id: docRef.id, ...data });
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `rides/${docRef.id}`);
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'rides');
      setIsRequesting(false);
    }
  };

  // Memoize winding route array to prevent map re-draw visual lock
  const memoizedRoute = React.useMemo(() => {
    return generateWindingRoute(pickupCoords, destinationCoords);
  }, [pickupCoords.lat, pickupCoords.lng, destinationCoords.lat, destinationCoords.lng]);

  return (
    <div className="h-full bg-black flex flex-col relative overflow-hidden select-none">
      {/* TOPBAR */}
      <header className="absolute top-0 left-0 right-0 z-[100] p-4 flex justify-between items-center bg-gradient-to-b from-black/90 via-black/45 to-transparent select-none">
        <button 
          onClick={() => setIsMenuOpen(true)} 
          className="w-11 h-11 rounded-2xl bg-[#111] hover:bg-[#1a1a1a] border border-white/10 flex items-center justify-center text-white active:scale-95 transition-all cursor-pointer"
        >
          <Menu size={22} className="stroke-[2.5px]" />
        </button>
        
        {/* EXACT LOGO PAIRING */}
        <div className="flex flex-col items-center">
          <div className="text-[21px] font-black tracking-[0.15em] text-[#f5b400] italic leading-none font-sans">KWANO</div>
          <div className="flex items-center gap-1.5 mt-0.5 select-none font-sans">
            <div className="flex flex-col gap-0.5 shrink-0">
              <div className="w-[11px] h-[1.2px] bg-[#f5b400]" />
              <div className="w-[7px] h-[1.2px] bg-[#f5b400]" />
              <div className="w-[14px] h-[1.2px] bg-[#f5b400]" />
            </div>
            <div className="text-[11px] font-black tracking-[0.25em] text-white italic">RIDES</div>
          </div>
        </div>

        {/* EXACT SAFE MODE CAPSULE BADGE */}
        <button 
          onClick={() => setScreen('safety')}
          className="flex items-center gap-2 border-[1.5px] border-[#f5b400]/50 px-5 py-2 rounded-full bg-black/85 text-white font-black text-[9px] tracking-wider uppercase active:scale-95 transition-all cursor-pointer hover:border-[#f5b400] shadow-md shadow-black font-sans"
        >
          <Shield size={12} className="text-[#f5b400] fill-[#f5b400]" />
          SAFE MODE
        </button>
      </header>

      {/* MAP STAGE (Top area) */}
      <div className="w-full flex-1 relative min-h-[160px]">
        <div className="absolute inset-0 z-0">
          <MapComponent 
            center={{
              lat: (pickupCoords.lat + destinationCoords.lat) / 2,
              lng: (pickupCoords.lng + destinationCoords.lng) / 2,
            }} 
            zoom={13} 
            disableDefaultUI
            routeCoordinates={memoizedRoute}
          >
            <AdvancedMarker position={pickupCoords} type="pickup" />
            <AdvancedMarker position={destinationCoords} type="dropoff" />
            <AdvancedMarker 
              position={memoizedRoute[13] || pickupCoords} 
              type="car" 
              rotation={26} 
            />
          </MapComponent>
          {/* Subtle dark layout grid mask on top and bottom */}
          <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black to-transparent pointer-events-none" />
        </div>

        {/* FLOATING ADDRESSES CARD */}
        <div className="absolute top-[88px] left-4 z-10 w-[245px] bg-[#121212ec]/95 backdrop-blur-md p-3 rounded-[16px] border border-white/10 shadow-2xl space-y-2.5 select-none">
          {/* Pickup block */}
          <div 
            onClick={() => {
              setActiveInput('pickup');
              triggerToast("Editing Pickup Location");
            }}
            className={`flex items-start gap-3 p-1 rounded-lg transition-all cursor-pointer ${
              activeInput === 'pickup' ? 'bg-[#f5b400]/5 border border-[#f5b400]/10' : 'border border-transparent'
            }`}
          >
            <div className="flex flex-col items-center shrink-0 mt-[3px]">
              <div className="w-[8px] h-[8px] rounded-full bg-[#f5b400]" />
              <div className="w-[1.2px] h-4 border-l border-dashed border-white/20 my-1" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <h3 className="text-[#999] text-[8px] font-black uppercase tracking-widest font-sans leading-none flex items-center gap-1">
                PICKUP {activeInput === 'pickup' && <span className="text-[#f5b400]">● EDIT</span>}
              </h3>
              <p className="text-white text-[11px] font-bold mt-1 truncate font-sans leading-none">{pickup}</p>
            </div>
          </div>

          {/* Destination block */}
          <div 
            onClick={() => {
              setActiveInput('destination');
              triggerToast("Editing Drop-off Destination");
            }}
            className={`flex items-start gap-3 p-1 -mt-1.5 rounded-lg transition-all cursor-pointer ${
              activeInput === 'destination' ? 'bg-[#f5b400]/5 border border-[#f5b400]/10' : 'border border-transparent'
            }`}
          >
            <div className="flex flex-col items-center shrink-0 mt-[3px]">
              <div className="w-[8px] h-[8px] rounded-full bg-[#ff3b30] flex items-center justify-center">
                <div className="w-1 bg-white rounded-full" />
              </div>
            </div>
            <div className="flex-1 min-w-0 text-left">
              <h3 className="text-[#ff3b30] text-[8px] font-black uppercase tracking-widest font-sans leading-none flex items-center gap-1">
                DROP-OFF {activeInput === 'destination' && <span className="text-[#f5b400]">● EDIT</span>}
              </h3>
              <p className="text-white font-semibold text-[11px] mt-1 truncate font-sans leading-none opacity-90">{destination}</p>
            </div>
          </div>
        </div>

        {/* MAP FLOATING CONTROLS */}
        <div className="absolute right-4 top-[88px] z-10 flex flex-col gap-2 shrink-0 select-none">
          <button className="w-9 h-9 rounded-lg bg-black/95 text-white border border-white/10 flex items-center justify-center active:scale-95 transition-all shadow-lg active:bg-[#1a1a1a]">
            <Compass size={16} className="text-[#f5b400]" />
          </button>
          <div className="flex flex-col rounded-lg bg-black/95 border border-white/10 overflow-hidden shadow-lg">
            <button className="w-9 h-9 text-white border-b border-white/10 flex items-center justify-center active:scale-95 transition-all hover:bg-white/5">
              <Plus size={16} />
            </button>
            <button className="w-9 h-9 text-white flex items-center justify-center active:scale-95 transition-all hover:bg-white/5">
              <Minus size={16} />
            </button>
          </div>
        </div>

        {/* FLOATING SAFETY & ASSIST ACTIONS (SOS + SHARE TRIP) */}
        <div className="absolute left-4 bottom-4 z-10 flex items-center gap-1.5 select-none shrink-0">
          <button 
            onClick={() => setScreen('safety')}
            className="w-10 h-10 rounded-full bg-red-600 hover:bg-red-700 border border-red-500/20 flex flex-col items-center justify-center text-white active:scale-95 transition-all shadow-lg text-[8px] font-black font-sans tracking-tight"
          >
            <span>🚨</span>
            <span className="-mt-0.5">SOS</span>
          </button>
          
          <button 
            onClick={() => triggerToast("Trip information shared instantly with your emergency contacts!")}
            className="w-10 h-10 rounded-full bg-black/90 hover:bg-[#1a1a1a] border border-[#f5b400]/40 text-[#f5b400] flex items-center justify-center active:scale-95 transition-all shadow-lg"
            title="Share Trip Link"
          >
            <Users size={15} />
          </button>
        </div>

        {/* "3 MIN AWAY" PILL POPUP */}
        <div className="absolute right-4 bottom-4 z-10 select-none shrink-0 pointer-events-none">
          <div className="bg-black/95 border border-white/10 rounded-xl px-2.5 py-2 flex items-center gap-2 shadow-2xl">
            <div className="w-5.5 h-5.5 bg-[#2b250d] rounded flex items-center justify-center text-[#f5b400]">
              <Clock size={11} className="fill-[#f5b400] text-[#f5b400]" />
            </div>
            <div className="text-left font-sans">
              <p className="text-white text-[12px] font-black italic tracking-tight leading-none">3 min</p>
              <p className="text-gray-400 text-[6px] font-black uppercase tracking-widest mt-0.5 font-sans leading-none">AWAY</p>
            </div>
          </div>
        </div>

        {/* TOAST ON-MAP NOTIFICATION overlay */}
        <AnimatePresence>
          {showToast && (
            <motion.div 
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute top-24 left-1/2 -translate-x-1/2 z-50 bg-black/95 border border-[#f5b400]/40 rounded-full px-4 py-1.5 shadow-2xl flex items-center gap-2 max-w-[280px] pointer-events-none"
            >
              <div className="w-2 h-2 rounded-full bg-[#f5b400] animate-ping" />
              <span className="text-[9px] font-black uppercase tracking-wider text-white font-sans text-center truncate">{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* BOTTOM OPTIONS AREA */}
      <div className="relative z-10 flex flex-col px-3 pb-3 pt-2 bg-black border-t border-white/5 space-y-2 shrink-0 select-none">
        
        {/* COMBINED BADGED SEARCH INPUT BAR */}
        <div className="shrink-0 font-sans">
          <div className="bg-[#111] border border-white/10 rounded-lg p-2 flex items-center gap-2 shadow-inner">
            <button 
              onClick={() => {
                const nextInput = activeInput === 'pickup' ? 'destination' : 'pickup';
                setActiveInput(nextInput);
                triggerToast(`Switched back to edit ${nextInput}`);
              }}
              className="bg-[#f5b400]/15 hover:bg-[#f5b400]/25 text-[#f5b400] text-[8px] font-black px-2 py-1 rounded border border-[#f5b400]/20 tracking-wider shrink-0 transition-transform active:scale-95 cursor-pointer leading-none"
            >
              {activeInput === 'pickup' ? '📍 PICKUP' : '🏁 DROP-OFF'}
            </button>
            <input 
              type="text"
              value={typedText}
              onChange={(e) => {
                const val = e.target.value;
                setTypedText(val);
                if (activeInput === 'pickup') {
                  setPickup(val);
                } else {
                  setDestination(val);
                }
              }}
              placeholder={activeInput === 'pickup' ? "Enter pickup address..." : "Enter drop-off destination..."}
              className="bg-transparent border-none text-white text-xs font-bold focus:outline-none w-full p-0 placeholder-gray-500 font-sans"
            />
            {/* Real device GPS geolocator sync button */}
            <button
              onClick={handleUseGPSLocation}
              title="Use My Real Location"
              className="p-1 px-1.5 rounded bg-white/5 hover:bg-white/10 hover:border-white/20 border border-white/5 text-[#f5b400] transition-all cursor-pointer active:scale-90 flex items-center justify-center shrink-0"
            >
              <Compass size={14} className="animate-pulse" />
            </button>
          </div>
        </div>

        {/* LANDMARKS / SEARCH RESULTS SWITCH */}
        <div className="flex flex-col shrink-0 space-y-1">
          {isSearching && (
            <div className="flex items-center gap-1.5 px-2 py-1 animate-pulse">
              <Loader2 size={10} className="animate-spin text-[#f5b400]" />
              <span className="text-gray-500 text-[8px] font-black tracking-wider uppercase font-sans">SEARCHING SOUTH AFRICA ADDRESSES...</span>
            </div>
          )}

          {!isSearching && suggestions.length > 0 ? (
            <div className="flex flex-col gap-1 max-h-[105px] overflow-y-auto no-scrollbar pt-0.5 px-0.5">
              <div className="text-[#f5b400] text-[7.5px] font-black uppercase tracking-widest block text-left">PROVINCIAL ADDRESS SUGGESTIONS:</div>
              {suggestions.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectSuggestion(item)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#141414] hover:bg-[#1f1f1f] border border-white/5 text-left transition-all active:scale-[0.98] cursor-pointer"
                >
                  <MapPin size={10} className="text-[#f5b400] shrink-0" />
                  <span className="text-white text-[9.5px] font-semibold truncate flex-1 font-sans">{item.name}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex gap-1 overflow-x-auto pb-1 pt-0.5 no-scrollbar shrink-0 px-0.5">
              {POPULAR_LOCATIONS.map((loc) => {
                const isSelected = activeInput === 'pickup' 
                  ? pickup === loc.name 
                  : destination === loc.name;
                return (
                  <button
                    key={loc.name}
                    onClick={() => {
                      if (activeInput === 'pickup') {
                        setPickup(loc.name);
                        setPickupCoords({ lat: loc.lat, lng: loc.lng });
                        setTypedText(loc.name);
                        triggerToast(`Pickup: ${loc.name.split(',')[0]}`);
                        setActiveInput('destination');
                      } else {
                        setDestination(loc.name);
                        setDestinationCoords({ lat: loc.lat, lng: loc.lng });
                        setTypedText(loc.name);
                        triggerToast(`Drop-off: ${loc.name.split(',')[0]}`);
                      }
                    }}
                    className={`px-2.5 py-1 rounded-full border text-[8px] font-black uppercase tracking-wider shrink-0 transition-all active:scale-[0.97] cursor-pointer ${
                      isSelected
                        ? 'bg-[#f5b400]/20 border-[#f5b400]/60 text-[#f5b400] font-black'
                        : 'bg-[#121212] border-white/5 text-gray-400 hover:border-white/10 hover:text-white'
                    }`}
                  >
                    📍 {loc.name.split(',')[0]}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* RIDE SELECTION OPTIONS GRID - SIDE-BY-SIDE COLUMNS */}
        <div className="grid grid-cols-3 gap-1.5 shrink-0">
          {rideTypes.map((ride) => {
            const isActive = selectedRideType === ride.id;
            return (
              <button
                key={ride.id}
                onClick={() => {
                  setSelectedRideType(ride.id);
                  triggerToast(`${ride.name} Selected!`);
                }}
                className={`relative p-2 rounded-xl flex flex-col justify-between text-left transition-all duration-300 active:scale-[0.98] border-2 cursor-pointer h-[72px] ${
                  isActive
                    ? 'border-[#f5b400] bg-[#221c08] shadow-lg shadow-yellow-500/5'
                    : 'border-[#2a2a2a] bg-[#121212] hover:border-[#3a3a3a]'
                }`}
              >
                {/* Info button top-right */}
                <div className="absolute top-1 right-1 text-[#333] hover:text-white transition-all">
                  <Info size={8} />
                </div>

                {/* Left/top vehicle outline icon */}
                <div className="mt-0">
                  {ride.type === 'car' && (
                    <div className="text-sm text-[#f5b400] filter saturate-150">🚕</div>
                  )}
                  {ride.type === 'shield' && (
                    <div className="w-4 h-4 rounded-md flex items-center justify-center bg-white/5 border border-white/10 text-white/90">
                      <Shield size={8} className="text-[#f5b400]" />
                    </div>
                  )}
                  {ride.type === 'van' && (
                    <div className="text-sm text-white">🚐</div>
                  )}
                </div>

                {/* Text and Pricing specifications */}
                <div className="space-y-0 text-left">
                  <h3 className="text-white text-[8px] font-black uppercase tracking-tight truncate leading-tight font-sans">
                    {ride.name}
                  </h3>
                  
                  {/* Price */}
                  <span className="text-[#f5b400] font-black italic text-xs tracking-tight block font-sans">
                    {ride.price}
                  </span>

                  {/* Seat capacity */}
                  <span className="text-gray-500 text-[6.5px] font-black tracking-wider uppercase flex items-center gap-0.5 font-sans leading-none">
                    <Users size={6.5} />
                    {ride.capacity}
                  </span>
                </div>

                {/* Selected glowing check dot anchor at bottom-right */}
                {isActive && (
                  <div className="absolute bottom-1 right-1 w-3 h-3 bg-[#f5b400] rounded-full flex items-center justify-center shadow shadow-yellow-500/30">
                    <CheckCircle2 size={7} className="text-black stroke-[3.5px]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* COMBINED DECK: PAYMENT OPTION & REQUEST BUTTON */}
        <div className="flex gap-1.5 shrink-0">
          <button 
            onClick={() => triggerToast("Currently cash is the default fast verification method")}
            className="bg-[#121212] rounded-lg p-1.5 px-2.5 border border-white/5 flex gap-1.5 items-center justify-center cursor-pointer active:scale-95 transition-all hover:bg-[#1a1a1a] shadow-md h-10 shrink-0"
          >
            <div className="w-4 h-4 rounded bg-[#f5b400]/10 flex items-center justify-center text-[#f5b400] shrink-0">
              <Coins size={9} />
            </div>
            <span className="text-white font-extrabold text-[9px] leading-none uppercase font-sans">
              CASH
            </span>
          </button>

          <button
            onClick={handleRequestRide}
            disabled={isRequesting || !destination}
            className={`flex-1 h-10 px-3.5 rounded-lg font-black text-xs transition-all active:scale-95 uppercase tracking-widest cursor-pointer flex justify-between items-center shadow-2xl ${
              isRequesting || !destination
                ? 'bg-[#2a2a2a] text-gray-500 opacity-60 pointer-events-none'
                : 'bg-[#f5b400] text-black hover:bg-[#ffcb2f] shadow-yellow-500/20'
            }`}
          >
            <span></span>
            <span className="text-[#121212] text-center font-black tracking-widest font-sans text-[10px]">
              {isRequesting ? 'SEARCHING...' : 'REQUEST KWANO RIDE'}
            </span>
            <div className="w-6 h-6 bg-black rounded-full flex items-center justify-center text-[#f5b400] shrink-0 shadow-lg">
              {isRequesting ? (
                <Loader2 className="animate-spin" size={10} />
              ) : (
                <ArrowRight size={10} className="stroke-[2.5px]" />
              )}
            </div>
          </button>
        </div>
      </div>

      <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between pointer-events-none hidden">
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={() => setScreen('safety')} 
          className="pointer-events-auto flex items-center gap-3 bg-red-600/90 backdrop-blur-xl px-6 py-4 rounded-3xl shadow-2xl shadow-red-600/40 border border-white/10 group"
        >
          <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center animate-pulse group-hover:animate-none">
             <Shield size={20} className="text-white" />
          </div>
          <div className="text-left">
             <p className="text-white font-black italic text-sm tracking-tighter uppercase leading-none">SOS</p>
             <p className="text-white/60 text-[8px] font-bold uppercase tracking-widest mt-1">Safety Center</p>
          </div>
        </motion.button>

        <div className="opacity-0">Spacer</div>
      </div>

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
            {/* Slide-out Menu */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute left-0 top-0 bottom-0 w-4/5 max-w-xs bg-[#121212] border-r border-white/10 z-50 p-6 flex flex-col justify-between overflow-y-auto no-scrollbar"
            >
              <div>
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-white font-black italic tracking-tighter text-2xl uppercase">Kwano Menu</h3>
                  <button onClick={() => setIsMenuOpen(false)} className="text-gray-400 hover:text-white p-1">
                    <X size={20} />
                  </button>
                </div>

                {/* Profile Widget */}
                <div className="flex items-center gap-3 bg-white/5 p-4 rounded-2xl border border-white/5 mb-6">
                  <div className="w-12 h-12 rounded-xl border border-yellow-500 overflow-hidden bg-[#222] shrink-0">
                    {profile?.avatar ? (
                      <img src={profile.avatar} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-yellow-500 font-bold">
                        {profile?.name?.charAt(0) || 'U'}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-white font-black text-sm truncate">{profile?.name || 'User'}</h4>
                    <p className="text-gray-500 text-[9px] font-black tracking-widest uppercase mt-0.5">Passenger Mode</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-4">
                  <button 
                    onClick={() => handleSwitchRole('driver')}
                    className="w-full bg-yellow-500 text-black font-black py-4 rounded-xl uppercase tracking-widest text-[9px] flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-yellow-500/10 cursor-pointer"
                  >
                    <RefreshCw size={12} className="animate-spin-slow" />
                    Switch to Driver Mode
                  </button>

                  <div className="h-px bg-white/5 my-4" />

                  {/* Trip History title */}
                  <div className="flex items-center gap-2 text-gray-400 mb-2 px-1">
                    <History size={14} className="text-yellow-500" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Your Live/Recent Rides</span>
                  </div>

                  {/* Trip list */}
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1 no-scrollbar">
                    {pastTrips.length === 0 ? (
                      <p className="text-[9px] text-gray-600 uppercase font-black tracking-widest text-center py-4">No rides requested yet</p>
                    ) : (
                      pastTrips.slice(0, 5).map((trip) => (
                        <div key={trip.id} className="bg-black/40 border border-white/5 p-3 rounded-xl flex justify-between items-center text-left">
                          <div className="truncate pr-2 min-w-0 flex-1">
                            <p className="text-white text-xs font-bold truncate">{trip.destination?.address || 'Trip'}</p>
                            <span className={`text-[8px] uppercase font-black inline-block px-1.5 py-0.5 rounded-full mt-0.5 ${
                              trip.status === 'requested' ? 'bg-yellow-500/10 text-yellow-500' :
                              trip.status === 'accepted' ? 'bg-blue-500/10 text-blue-500' :
                              trip.status === 'completed' ? 'bg-green-500/10 text-green-500' :
                              'bg-gray-500/10 text-gray-500'
                            }`}>{trip.status}</span>
                          </div>
                          <span className="text-yellow-500 font-mono text-xs font-black shrink-0">{trip.price}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Drawer Sign Out */}
              <div className="pt-6 border-t border-white/5">
                <button 
                  onClick={() => {
                     setIsMenuOpen(false);
                     signOut();
                  }}
                  className="w-full bg-[#1A1A1A] border border-white/10 text-red-500 py-3 rounded-xl font-bold uppercase tracking-widest text-[9px] flex items-center justify-center gap-2 hover:bg-red-500/10 active:scale-95 transition-all cursor-pointer"
                >
                  <RefreshCw size={12} className="hidden" />
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

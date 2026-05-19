import React from 'react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { ShieldAlert, Phone, Share2, AlertTriangle, ChevronLeft, MapPin, Heart, ShieldCheck } from 'lucide-react';

export default function SafetyScreen() {
  const { setScreen } = useApp();

  return (
    <div className="h-full bg-black flex flex-col p-6 overflow-y-auto no-scrollbar">
      <div className="flex items-center justify-between mb-8">
        <button onClick={() => setScreen('passenger-home')} className="text-gray-500 hover:text-white">
          <ChevronLeft size={24} />
        </button>
        <span className="text-xs font-bold text-yellow-500 uppercase tracking-widest">Kwano Safety Hub</span>
        <div className="w-6" />
      </div>

      <div className="mb-12">
        <h2 className="text-3xl font-bold text-white mb-4 italic">Safety is our Priority.</h2>
        <p className="text-gray-400 leading-relaxed">
          In South Africa, transport safety is critical. We've built Kwano Rides with specific tools to keep you and the community protected.
        </p>
      </div>

      {/* Emergency Button */}
      <motion.button 
        whileTap={{ scale: 0.95 }}
        className="w-full bg-red-600 p-8 rounded-3xl flex flex-col items-center justify-center gap-4 shadow-[0_0_40px_rgba(220,38,38,0.3)] mb-8"
      >
        <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
          <ShieldAlert size={48} className="text-white" />
        </div>
        <div className="text-center">
          <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">SOS EMERGENCY</h3>
          <p className="text-red-100 text-xs font-bold opacity-80 uppercase tracking-widest mt-1">Direct link to 10111 & Private Security</p>
        </div>
      </motion.button>

      <div className="grid grid-cols-2 gap-4 mb-8">
        {[
          { label: 'Share Trip', icon: Share2, desc: 'Live location to family' },
          { label: 'Support', icon: Phone, desc: '24/7 Kwano Assist' },
          { label: 'Report', icon: AlertTriangle, desc: 'Anonymous safety tip' },
          { label: 'Verify', icon: ShieldCheck, desc: 'Check driver ID' },
        ].map((item, idx) => (
          <button key={idx} className="bg-[#111] p-4 rounded-2xl border border-white/5 text-left group hover:border-yellow-500/30 transition-all">
            <div className="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-yellow-500/20 transition-colors">
              <item.icon size={20} className="text-yellow-500" />
            </div>
            <h4 className="text-white font-bold text-sm mb-1">{item.label}</h4>
            <p className="text-[10px] text-gray-500 leading-tight uppercase font-bold tracking-wider">{item.desc}</p>
          </button>
        ))}
      </div>

      <div className="p-6 bg-[#1A1A1A] rounded-3xl border border-yellow-500/20 mb-12">
        <div className="flex items-center gap-4 mb-4">
          <div className="bg-yellow-500 p-2 rounded-full"><Heart size={16} className="text-black" /></div>
          <h3 className="text-white font-bold tracking-tight">Community Watch</h3>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed italic">
          Every ride is monitored by our local community ops center. We track unusual stops and route deviations in real-time.
        </p>
      </div>

      <div className="mt-auto pt-8 border-t border-white/5 flex flex-col items-center">
        <p className="text-[10px] text-gray-600 uppercase tracking-[0.2em] mb-4">Partnered with</p>
        <div className="flex gap-8 opacity-30 grayscale">
          <div className="w-12 h-6 bg-white rounded" />
          <div className="w-12 h-6 bg-white rounded" />
          <div className="w-12 h-6 bg-white rounded" />
        </div>
      </div>
    </div>
  );
}

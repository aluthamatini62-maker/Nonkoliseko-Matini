import React from 'react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { Users, Car, Map, AlertTriangle, ChevronLeft, ShieldCheck, TrendingUp, Search } from 'lucide-react';

export default function AdminDashboard() {
  const { setScreen } = useApp();

  const stats = [
    { label: 'Active Riders', value: '1,284', icon: Users, color: 'text-blue-500' },
    { label: 'Active Drivers', value: '156', icon: Car, color: 'text-yellow-500' },
    { label: 'Running Trips', value: '42', icon: Map, color: 'text-green-500' },
    { label: 'Alerts', value: '0', icon: AlertTriangle, color: 'text-red-500' },
  ];

  return (
    <div className="h-full bg-black flex flex-col p-6 overflow-y-auto">
      <header className="flex justify-between items-center mb-10">
        <div className="flex items-center gap-4">
          <button onClick={() => setScreen('passenger-home')} className="w-12 h-12 rounded-2xl bg-[#1A1A1A] flex items-center justify-center text-white">
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-black italic tracking-tighter text-white uppercase leading-none">ADMIN<br/><span className="text-yellow-500">PORTAL</span></h1>
          </div>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-yellow-500 flex items-center justify-center text-black font-black">
          AD
        </div>
      </header>

      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
        <input 
          type="text" 
          placeholder="Search riders, drivers or trips..." 
          className="w-full bg-[#1A1A1A] border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-yellow-500/50"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-[#1A1A1A] border border-white/5 p-6 rounded-[30px] flex flex-col gap-4">
             <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center ${stat.color}`}>
                <stat.icon size={20} />
             </div>
             <div>
                <p className="text-white font-black italic tracking-tighter text-2xl">{stat.value}</p>
                <p className="text-gray-500 text-[8px] font-black uppercase tracking-widest mt-1">{stat.label}</p>
             </div>
          </div>
        ))}
      </div>

      <div className="bg-[#1A1A1A] rounded-[30px] p-8 border border-white/5 mb-8">
         <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
               <TrendingUp size={18} className="text-yellow-500" />
               <h2 className="text-white font-black italic text-xl tracking-tighter uppercase">Operations Hub</h2>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-green-500 bg-green-500/10 px-3 py-1 rounded-full">SYSTEM STABLE</span>
         </div>
         
         <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/5">
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#222] overflow-hidden">
                       <img src={`https://i.pravatar.cc/100?u=${i}`} alt="Avatar" />
                    </div>
                    <div>
                       <p className="text-white font-bold text-xs">Trip Request #{2450 + i}</p>
                       <p className="text-gray-500 text-[10px] font-bold uppercase">Khayelitsha {'->'} Town</p>
                    </div>
                 </div>
                 <span className="text-yellow-500 font-black italic text-[10px]">PENDING</span>
              </div>
            ))}
         </div>
      </div>

      <div className="mt-auto bg-yellow-500 rounded-3xl p-6 flex items-center justify-between shadow-2xl shadow-yellow-500/20">
         <div className="flex items-center gap-4">
            <ShieldCheck size={24} className="text-black" />
            <div>
               <p className="text-black font-black uppercase tracking-widest text-[10px]">Security Status</p>
               <p className="text-black font-bold text-sm italic tracking-tighter">ALL DRIVERS VERIFIED</p>
            </div>
         </div>
         <button className="bg-black text-white text-[8px] font-black px-4 py-2 rounded-xl uppercase tracking-widest">Reports</button>
      </div>
    </div>
  );
}

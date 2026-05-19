import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { ChevronLeft, Users, FileCheck, Ban, TrendingUp, Search, MoreVertical, ShieldCheck, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';

export default function AdminDashboard() {
  const { setScreen } = useApp();
  const [activeTab, setActiveTab] = useState('drivers');

  const stats = [
    { label: 'Active Riders', value: '4,281', change: '+12%' },
    { label: 'Verified Drivers', value: '1,120', change: '+8%' },
    { label: 'Revenue 24h', value: 'R145k', change: '+15%' },
    { label: 'Safety Alerts', value: '0', change: '-100%' },
  ];

  const pendingDrivers = [
    { name: 'Lerato M.', phone: '071 823 4511', car: 'Polo Vivo', status: 'Pending Docs' },
    { name: 'Kgosi P.', phone: '083 442 9012', car: 'Toyota Quest', status: 'Verification Required' },
  ];

  return (
    <div className="h-full bg-black flex flex-col p-6 overflow-y-auto no-scrollbar">
      <div className="flex items-center justify-between mb-8">
        <button onClick={() => setScreen('driver-home')} className="text-gray-500 hover:text-white">
          <ChevronLeft size={24} />
        </button>
        <span className="text-xs font-bold text-yellow-500 uppercase tracking-widest">Admin Control Center</span>
        <div className="w-6" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-[#111] p-4 rounded-2xl border border-white/5">
             <div className="text-[10px] uppercase font-bold text-gray-500 tracking-widest mb-1">{stat.label}</div>
             <div className="text-xl font-bold text-white mb-1 tracking-tight">{stat.value}</div>
             <div className="text-[10px] font-bold text-green-500 uppercase">{stat.change} vs prev</div>
          </div>
        ))}
      </div>

      <div className="flex gap-4 border-b border-white/10 mb-6">
        {['drivers', 'trips', 'payments'].map((tab) => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "pb-2 text-xs font-bold uppercase tracking-widest transition-colors",
              activeTab === tab ? "text-yellow-500 border-b-2 border-yellow-500" : "text-gray-600"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="space-y-4 mb-12">
        <div className="relative group">
           <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" />
           <input 
             type="text" 
             placeholder="Search drivers or trips..."
             className="w-full bg-[#111] border border-white/5 py-3 pl-12 pr-4 rounded-xl text-sm text-white focus:outline-none focus:border-yellow-500/50"
           />
        </div>

        <h3 className="text-sm font-bold text-white italic mt-6 mb-4">Pending Approvals</h3>
        {pendingDrivers.map((driver, idx) => (
          <div key={idx} className="bg-[#111] p-4 rounded-2xl border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-4">
               <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center text-black font-bold">
                 {driver.name[0]}
               </div>
               <div>
                 <div className="text-sm font-bold text-white">{driver.name}</div>
                 <div className="text-[10px] text-gray-500 uppercase font-bold">{driver.car} • {driver.phone}</div>
               </div>
            </div>
            <button className="bg-yellow-500 text-black px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-tighter">Review</button>
          </div>
        ))}
      </div>

      <div className="space-y-4">
         <h3 className="text-sm font-bold text-white italic mb-4">System Health</h3>
         <div className="bg-[#111] p-6 rounded-3xl border border-green-500/20 flex items-center gap-4">
            <ShieldCheck className="text-green-500" size={32} />
            <div>
               <div className="text-sm font-bold text-white">Security Systems Operational</div>
               <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mt-1">Real-time GPS Monitoring: Active</div>
            </div>
         </div>
         <div className="bg-[#111] p-6 rounded-3xl border border-white/5 flex items-center gap-4 opacity-50">
            <AlertCircle className="text-gray-500" size={32} />
            <div>
               <div className="text-sm font-bold text-white">Pending Maintenance</div>
               <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mt-1">Scheduled for Sunday 02:00 AM</div>
            </div>
         </div>
      </div>
    </div>
  );
}

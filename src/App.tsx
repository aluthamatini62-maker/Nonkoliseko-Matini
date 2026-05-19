import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from './context/AppContext';
import SplashScreen from './screens/SplashScreen';
import AuthScreen from './screens/AuthScreen';
import RoleSelectionScreen from './screens/RoleSelectionScreen';
import PassengerHome from './screens/PassengerHome';
import DriverHome from './screens/DriverHome';
import SafetyScreen from './screens/SafetyScreen';
import TrackingScreen from './screens/TrackingScreen';
import AdminDashboard from './screens/AdminDashboard';

export default function App() {
  const { currentScreen, loading } = useApp();

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-yellow-500/30 overflow-hidden">
      <div className="relative mx-auto max-w-md h-screen bg-[#111] shadow-2xl overflow-hidden">
        <AnimatePresence mode="wait">
          {currentScreen === 'splash' && <SplashScreen key="splash" />}
          {currentScreen === 'auth' && <AuthScreen key="auth" />}
          {currentScreen === 'auth-role-selection' && <RoleSelectionScreen key="role" />}
          {currentScreen === 'passenger-home' && <PassengerHome key="passenger" />}
          {currentScreen === 'driver-home' && <DriverHome key="driver" />}
          {currentScreen === 'safety' && <SafetyScreen key="safety" />}
          {currentScreen === 'tracking' && <TrackingScreen key="tracking" />}
          {currentScreen === 'admin' && <AdminDashboard key="admin" />}
        </AnimatePresence>
      </div>
    </div>
  );
}

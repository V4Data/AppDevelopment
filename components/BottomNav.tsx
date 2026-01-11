
import React from 'react';
import { Home, Users, ClipboardList, Smartphone } from 'lucide-react';
import { NavTab } from '../types.ts';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  const getTabStyles = (tab: NavTab) => {
    if (activeTab !== tab) return 'text-slate-300 hover:text-slate-400';
    
    switch (tab) {
      case 'HOME': return 'text-emerald-500 scale-110';
      case 'MEMBERS': return 'text-indigo-500 scale-110';
      case 'LOGS': return 'text-amber-500 scale-110';
      case 'DEVICES': return 'text-rose-500 scale-110';
      default: return 'text-slate-900 scale-110';
    }
  };

  const getGlowStyles = (tab: NavTab) => {
    if (activeTab !== tab) return 'opacity-0';
    
    switch (tab) {
      case 'HOME': return 'bg-emerald-500/10 opacity-100';
      case 'MEMBERS': return 'bg-indigo-500/10 opacity-100';
      case 'LOGS': return 'bg-amber-500/10 opacity-100';
      case 'DEVICES': return 'bg-rose-500/10 opacity-100';
      default: return 'bg-slate-500/10 opacity-100';
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-slate-100 px-6 py-4 flex justify-between items-center z-50 safe-area-bottom shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.05)]">
      <button 
        onClick={() => onTabChange('HOME')}
        className={`relative flex flex-col items-center gap-1 transition-all p-2 rounded-2xl ${getTabStyles('HOME')}`}
      >
        <div className={`absolute inset-0 rounded-2xl transition-all duration-300 ${getGlowStyles('HOME')}`} />
        <Home size={22} strokeWidth={activeTab === 'HOME' ? 3 : 2} className="relative z-10" />
        <span className={`text-[9px] font-black uppercase tracking-widest relative z-10 ${activeTab === 'HOME' ? 'opacity-100' : 'opacity-60'}`}>Home</span>
      </button>
      
      <button 
        onClick={() => onTabChange('MEMBERS')}
        className={`relative flex flex-col items-center gap-1 transition-all p-2 rounded-2xl ${getTabStyles('MEMBERS')}`}
      >
        <div className={`absolute inset-0 rounded-2xl transition-all duration-300 ${getGlowStyles('MEMBERS')}`} />
        <Users size={22} strokeWidth={activeTab === 'MEMBERS' ? 3 : 2} className="relative z-10" />
        <span className={`text-[9px] font-black uppercase tracking-widest relative z-10 ${activeTab === 'MEMBERS' ? 'opacity-100' : 'opacity-60'}`}>Members</span>
      </button>
      
      <button 
        onClick={() => onTabChange('LOGS')}
        className={`relative flex flex-col items-center gap-1 transition-all p-2 rounded-2xl ${getTabStyles('LOGS')}`}
      >
        <div className={`absolute inset-0 rounded-2xl transition-all duration-300 ${getGlowStyles('LOGS')}`} />
        <ClipboardList size={22} strokeWidth={activeTab === 'LOGS' ? 3 : 2} className="relative z-10" />
        <span className={`text-[9px] font-black uppercase tracking-widest relative z-10 ${activeTab === 'LOGS' ? 'opacity-100' : 'opacity-60'}`}>Logs</span>
      </button>
      
      <button 
        onClick={() => onTabChange('DEVICES')}
        className={`relative flex flex-col items-center gap-1 transition-all p-2 rounded-2xl ${getTabStyles('DEVICES')}`}
      >
        <div className={`absolute inset-0 rounded-2xl transition-all duration-300 ${getGlowStyles('DEVICES')}`} />
        <Smartphone size={22} strokeWidth={activeTab === 'DEVICES' ? 3 : 2} className="relative z-10" />
        <span className={`text-[9px] font-black uppercase tracking-widest relative z-10 ${activeTab === 'DEVICES' ? 'opacity-100' : 'opacity-60'}`}>Devices</span>
      </button>
    </nav>
  );
};

export default BottomNav;

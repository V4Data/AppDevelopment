import React from 'react';
import { Home, Users, ClipboardList, Smartphone } from 'lucide-react';
import { NavTab } from '../types.ts';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-slate-100 px-6 py-4 flex justify-between items-center z-50 safe-area-bottom shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.05)]">
      <button 
        onClick={() => onTabChange('HOME')}
        className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'HOME' ? 'text-slate-900 scale-110' : 'text-slate-300 hover:text-slate-400'}`}
      >
        <Home size={22} strokeWidth={activeTab === 'HOME' ? 3 : 2} />
        <span className={`text-[9px] font-black uppercase tracking-widest ${activeTab === 'HOME' ? 'opacity-100' : 'opacity-60'}`}>Home</span>
      </button>
      <button 
        onClick={() => onTabChange('MEMBERS')}
        className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'MEMBERS' ? 'text-slate-900 scale-110' : 'text-slate-300 hover:text-slate-400'}`}
      >
        <Users size={22} strokeWidth={activeTab === 'MEMBERS' ? 3 : 2} />
        <span className={`text-[9px] font-black uppercase tracking-widest ${activeTab === 'MEMBERS' ? 'opacity-100' : 'opacity-60'}`}>Members</span>
      </button>
      <button 
        onClick={() => onTabChange('LOGS')}
        className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'LOGS' ? 'text-slate-900 scale-110' : 'text-slate-300 hover:text-slate-400'}`}
      >
        <ClipboardList size={22} strokeWidth={activeTab === 'LOGS' ? 3 : 2} />
        <span className={`text-[9px] font-black uppercase tracking-widest ${activeTab === 'LOGS' ? 'opacity-100' : 'opacity-60'}`}>Logs</span>
      </button>
      <button 
        onClick={() => onTabChange('DEVICES')}
        className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'DEVICES' ? 'text-slate-900 scale-110' : 'text-slate-300 hover:text-slate-400'}`}
      >
        <Smartphone size={22} strokeWidth={activeTab === 'DEVICES' ? 3 : 2} />
        <span className={`text-[9px] font-black uppercase tracking-widest ${activeTab === 'DEVICES' ? 'opacity-100' : 'opacity-60'}`}>Devices</span>
      </button>
    </nav>
  );
};

export default BottomNav;
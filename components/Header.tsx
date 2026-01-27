import React from 'react';
import { LogOut } from 'lucide-react';
import { User } from '../types.ts';

interface HeaderProps {
  user: User | null;
  onLogout: () => void;
  isConnected?: boolean;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout, isConnected = true }) => {
  return (
    <header className="bg-white/90 backdrop-blur-xl border-b border-slate-100 px-4 py-4 flex items-center justify-between sticky top-0 z-50 transition-all duration-300">
      <div className="flex items-center gap-3">
        <div className="bg-slate-900 text-white font-black w-10 h-10 flex items-center justify-center rounded-2xl text-[10px] tracking-tighter shadow-lg shadow-slate-900/10 relative">
          TC
          {/* Connection Status Indicator */}
          <div className={`absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`}>
            {isConnected && (
              <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75"></span>
            )}
          </div>
        </div>
        <div>
          <h1 className="text-sm font-black text-slate-900 uppercase tracking-tight leading-tight">The Cage</h1>
          <p className="text-[9px] text-emerald-500 font-bold uppercase leading-none tracking-wider">MMA-Gym & RS Fitness Academy</p>
        </div>
      </div>
      
      {user && (
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col items-end mr-1">
            <span className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">Authenticated</span>
            <span className="text-[10px] text-slate-900 font-black tracking-tight">{user.name}</span>
          </div>
          <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center group hover:bg-red-50 hover:border-red-100 transition-all duration-200 cursor-pointer overflow-hidden relative">
            <button 
              onClick={onLogout}
              className="absolute inset-0 w-full h-full flex items-center justify-center text-slate-400 group-hover:text-red-500"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;

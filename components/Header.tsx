import React from 'react';
import { LogOut, ShieldCheck } from 'lucide-react';
import { User } from '../types.ts';

interface HeaderProps {
  user: User | null;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <div className="bg-slate-900 text-white font-black w-9 h-9 flex items-center justify-center rounded-xl text-xs tracking-tighter">
          TC
        </div>
        <div>
          <h1 className="text-sm font-black text-slate-800 uppercase tracking-tight">The Cage</h1>
          <p className="text-[9px] text-emerald-500 font-bold uppercase leading-none">MMA-Gym & RS Fitness Academy</p>
        </div>
      </div>
      
      {user && (
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-slate-800 uppercase leading-none">Management Access</span>
            <span className="text-[9px] text-emerald-600 font-black tracking-wider">{user.phoneNumber}</span>
          </div>
          <button 
            onClick={onLogout}
            className="w-9 h-9 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      )}
    </header>
  );
};

export default Header;
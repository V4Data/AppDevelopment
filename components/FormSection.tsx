
import React from 'react';

interface FormSectionProps {
  title: string;
  children: React.ReactNode;
}

const FormSection: React.FC<FormSectionProps> = ({ title, children }) => {
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 mb-6">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
        <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">
          {title}
        </h3>
      </div>
      <div className="space-y-5">
        {children}
      </div>
    </div>
  );
};

export default FormSection;

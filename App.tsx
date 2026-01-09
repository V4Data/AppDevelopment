
import { useState, useMemo, useEffect, useCallback } from 'react';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import FormSection from './components/FormSection';
import { MembershipType, RegistrationData, NavTab, ServiceCategory, Member, MemberTab, User, LogEntry } from './types';
import { PACKAGES } from './constants';
import { supabase, PROJECT_ID } from './lib/supabase';
import { 
  Search, 
  Plus, 
  X, 
  ArrowRight,
  ShieldCheck,
  MessageCircle,
  BarChart3,
  Edit2,
  RefreshCw,
  Clock,
  Wifi,
  WifiOff,
  AlertTriangle,
  ChevronRight,
  User as UserIcon
} from 'lucide-react';

const MASTER_KEY = '240596';

// Strict mapping of allowed phone numbers to Manager names
const MANAGER_MAP: Record<string, string> = {
  '9595107293': 'Manager 1',
  '9823733536': 'Manager 2',
  '9130368298': 'Manager 3'
};

const ALLOWED_MANAGEMENT_PHONES = Object.keys(MANAGER_MAP);

const App: React.FC = () => {
  // Session & UI State
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('thecage_session');
    return saved ? JSON.parse(saved) : null;
  });
  const [activeTab, setActiveTab] = useState<NavTab>('HOME');
  const [memberTab, setMemberTab] = useState<MemberTab>('ALL');
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [enrollmentSuccess, setEnrollmentSuccess] = useState<Member | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Centralized Cloud Data
  const [members, setMembers] = useState<Member[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Validation States
  const [loginPhone, setLoginPhone] = useState('');
  const [loginError, setLoginError] = useState('');
  const [enrollPhoneError, setEnrollPhoneError] = useState('');

  // Enrollment Form State
  const [formData, setFormData] = useState<RegistrationData>({
    fullName: '',
    phoneNumber: '',
    email: '',
    membershipType: MembershipType.SINGLE,
    serviceCategory: ServiceCategory.GYM,
    packageId: PACKAGES[0].id,
    joiningDate: new Date().toISOString().split('T')[0],
    paymentReceived: 0,
  });

  // 1. HELPER: CLOUD LOGGING
  const addLog = async (action: string, details: string, userOverride?: User) => {
    const user = userOverride || currentUser;
    if (!user) return;

    const logId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    
    try {
      await supabase.from('logs').insert({
        id: logId,
        user_phone: user.phoneNumber,
        user_name: user.name,
        action: action,
        details: details,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error("Logging failed:", err);
    }
  };

  // 2. DATA FETCHING
  const fetchData = useCallback(async () => {
    if (!currentUser) return;
    setIsSyncing(true);
    setConnectionError(null);
    
    try {
      const { data: membersData, error: mError } = await supabase
        .from('members')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (mError) throw mError;

      if (membersData) {
        setMembers(membersData.map(m => ({
          id: m.id,
          fullName: m.full_name,
          phoneNumber: m.phone_number,
          email: m.email,
          membershipType: m.membership_type,
          serviceCategory: m.service_category,
          packageId: m.package_id,
          joiningDate: m.joining_date,
          expiryDate: m.expiry_date,
          totalPaid: Number(m.total_paid || 0),
          totalFee: Number(m.total_fee || 0)
        })));
      }

      const { data: logsData, error: lError } = await supabase
        .from('logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);
      
      if (lError) throw lError;

      if (logsData) {
        setLogs(logsData.map(l => ({
          id: l.id,
          userName: l.user_name || 'Staff',
          userPhone: l.user_phone,
          action: l.action,
          details: l.details,
          timestamp: l.timestamp
        })));
      }
    } catch (err: any) {
      console.error('Database connection error:', err);
      setConnectionError(err.message || 'Check your Supabase URL/Keys');
    } finally {
      setIsSyncing(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    fetchData();

    const membersChannel = supabase.channel('gym-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, () => {
        fetchData(); 
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'logs' }, (payload) => {
        const l = payload.new as any;
        setLogs(prev => [{
          id: l.id,
          userName: l.user_name || 'Staff',
          userPhone: l.user_phone,
          action: l.action,
          details: l.details,
          timestamp: l.timestamp
        }, ...prev]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(membersChannel);
    };
  }, [currentUser, fetchData]);

  // 3. HANDLERS
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const phoneClean = loginPhone.replace(/\D/g, '');
    const form = e.currentTarget as HTMLFormElement;
    const key = (new FormData(form)).get('masterKey') as string;
    
    if (key === MASTER_KEY && ALLOWED_MANAGEMENT_PHONES.includes(phoneClean)) {
      const derivedName = MANAGER_MAP[phoneClean];
      const user = { 
        phoneNumber: `+91${phoneClean}`, 
        name: derivedName, 
        loginTime: new Date().toISOString() 
      };
      setCurrentUser(user);
      localStorage.setItem('thecage_session', JSON.stringify(user));
      // Immediate log
      await addLog('LOGIN', `${user.name} logged in`, user);
    } else {
      setLoginError('INVALID PHONE NUMBER OR MASTER KEY');
    }
  };

  const handleLogout = async () => {
    if (currentUser) {
      await addLog('LOGOUT', `${currentUser.name} logged out`);
    }
    setCurrentUser(null);
    localStorage.removeItem('thecage_session');
  };

  const handleEnrollment = async () => {
    const phoneDigits = formData.phoneNumber.replace(/\D/g, '');
    if (phoneDigits.length !== 10) {
      setEnrollPhoneError('ENTER 10-DIGIT NUMBER');
      return;
    }

    setIsSyncing(true);
    const joining = new Date(formData.joiningDate);
    const pkg = PACKAGES.find(p => p.id === formData.packageId) || PACKAGES[0];
    const expiry = new Date(joining);
    expiry.setDate(expiry.getDate() + pkg.durationDays);

    const memberData = {
      id: editingMember?.id || Date.now().toString(),
      full_name: formData.fullName,
      phone_number: `+91${phoneDigits}`,
      email: formData.email,
      membership_type: formData.membershipType,
      service_category: formData.serviceCategory,
      package_id: formData.packageId,
      joining_date: joining.toISOString(),
      expiry_date: expiry.toISOString(),
      total_paid: Number(formData.paymentReceived),
      total_fee: pkg.price,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from('members').upsert(memberData);

    if (!error) {
      const logAction = editingMember ? 'MEMBER_UPDATE' : 'MEMBER_ENROLL';
      const logDetails = editingMember 
        ? `${currentUser?.name} updated profile for member ${formData.fullName}` 
        : `${currentUser?.name} enrolled new member ${formData.fullName} (${formData.serviceCategory})`;
      
      await addLog(logAction, logDetails);
      
      if (!editingMember) {
        setEnrollmentSuccess({
          id: memberData.id,
          fullName: memberData.full_name,
          phoneNumber: memberData.phone_number,
          email: memberData.email,
          membershipType: memberData.membership_type as MembershipType,
          serviceCategory: memberData.service_category as ServiceCategory,
          packageId: memberData.package_id,
          joiningDate: memberData.joining_date,
          expiryDate: memberData.expiry_date,
          totalPaid: memberData.total_paid,
          totalFee: memberData.total_fee
        });
      } else {
        closeEnrollmentFlow();
      }
    } else {
      alert('Error saving to cloud: ' + error.message);
    }
    
    setIsSyncing(false);
  };

  const getRemainingDays = (expiryDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const closeEnrollmentFlow = () => {
    setShowEnrollModal(false);
    setEnrollmentSuccess(null);
    setEditingMember(null);
    setEnrollPhoneError('');
    setFormData({
      fullName: '',
      phoneNumber: '',
      email: '',
      membershipType: MembershipType.SINGLE,
      serviceCategory: ServiceCategory.GYM,
      packageId: PACKAGES[0].id,
      joiningDate: new Date().toISOString().split('T')[0],
      paymentReceived: 0,
    });
  };

  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      const matchSearch = m.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || m.phoneNumber.includes(searchQuery);
      const daysLeft = getRemainingDays(m.expiryDate);
      
      switch (memberTab) {
        case 'ACTIVE': return matchSearch && daysLeft >= 0;
        case 'INACTIVE': return matchSearch && daysLeft < 0;
        case '7DAYS': return matchSearch && daysLeft >= 0 && daysLeft <= 7;
        case '15DAYS': return matchSearch && daysLeft >= 0 && daysLeft <= 15;
        default: return matchSearch;
      }
    });
  }, [members, searchQuery, memberTab]);

  if (!currentUser) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white p-10 rounded-[40px] shadow-2xl">
        <div className="bg-emerald-500 w-16 h-16 rounded-3xl flex items-center justify-center mb-8 mx-auto text-white shadow-lg">
          <ShieldCheck size={32} />
        </div>
        <h2 className="text-2xl font-black mb-2 text-center uppercase tracking-tight text-slate-800">Log In</h2>
        <p className="text-[10px] text-slate-400 font-bold text-center uppercase tracking-widest mb-8">Management Access Only</p>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <UserIcon size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="tel" required value={loginPhone} maxLength={10} onChange={e => setLoginPhone(e.target.value.replace(/\D/g, ''))} className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-14 pr-5 py-4 font-bold text-black focus:ring-2 focus:ring-emerald-500/50 outline-none" placeholder="Manager Phone" />
          </div>
          <input name="masterKey" type="password" required className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 font-black text-black focus:ring-2 focus:ring-emerald-500/50 outline-none" placeholder="Master Key" />
          
          {loginError && <p className="text-red-500 text-[10px] font-black text-center uppercase">{loginError}</p>}
          
          <button className="w-full bg-emerald-500 text-white py-5 rounded-3xl font-black active:scale-[0.98] transition-all shadow-lg shadow-emerald-500/20 mt-4">
            LOG IN & SYNC
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-28 text-black">
      <Header user={currentUser} onLogout={handleLogout} />
      
      {/* Cloud Status Bar */}
      <div className={`px-4 py-2 flex items-center justify-between transition-colors duration-500 ${connectionError ? 'bg-red-900' : 'bg-slate-900'}`}>
        <div className="flex items-center gap-2">
           <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-emerald-400 animate-pulse' : connectionError ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
           <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
             {connectionError ? <WifiOff size={10} className="text-red-500" /> : <Wifi size={10} className="text-emerald-500" />}
             {connectionError ? `OFFLINE: ${connectionError}` : `Live: ${PROJECT_ID}`}
           </span>
        </div>
        <div className="text-[8px] font-black text-emerald-400 uppercase">
          {isSyncing ? 'Synchronizing Cloud...' : 'Central DB Synced'}
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 pt-8">
        {activeTab === 'HOME' && (
          <div className="space-y-6">
            <button onClick={() => setShowEnrollModal(true)} disabled={!!connectionError} className="w-full bg-slate-900 text-white rounded-3xl p-6 flex items-center justify-between shadow-xl group disabled:opacity-50">
              <div className="flex items-center gap-4">
                <div className="bg-emerald-500 p-3 rounded-2xl"><Plus size={24} /></div>
                <div className="text-left">
                  <h4 className="font-black uppercase text-sm">Enroll Member</h4>
                  <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest">Instant Global Sync</p>
                </div>
              </div>
              <ArrowRight size={20} className="text-slate-700 group-active:translate-x-1 transition-transform" />
            </button>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <span className="text-slate-400 font-bold text-[9px] uppercase tracking-widest block mb-1">Active Now</span>
                <span className="text-2xl font-black text-black">{members.filter(m => getRemainingDays(m.expiryDate) >= 0).length}</span>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <span className="text-slate-400 font-bold text-[9px] uppercase tracking-widest block mb-1">Database Size</span>
                <span className="text-2xl font-black text-black">{members.length}</span>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <BarChart3 size={18} className="text-emerald-500" />
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Activity Overview</h3>
                </div>
              </div>
              <p className="text-[10px] font-bold text-slate-500 leading-relaxed uppercase">
                Welcome, <span className="text-slate-900">{currentUser.name}</span>. All changes you make are logged and tracked centrally.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'MEMBERS' && (
          <div className="space-y-6">
            <div className="sticky top-16 bg-slate-50/95 backdrop-blur-sm z-30 pt-4 pb-2">
              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input type="text" placeholder="Search members..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-bold shadow-sm focus:outline-none" />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {(['ALL', 'ACTIVE', 'INACTIVE', '7DAYS', '15DAYS'] as MemberTab[]).map(tab => (
                  <button key={tab} onClick={() => setMemberTab(tab)} className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all shrink-0 ${memberTab === tab ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 border-slate-100'}`}>
                    {tab === '7DAYS' ? '7 Days' : tab === '15DAYS' ? '15 Days' : tab}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="space-y-3">
              {filteredMembers.map(member => {
                const daysLeft = getRemainingDays(member.expiryDate);
                const statusColor = daysLeft < 0 ? 'bg-red-500' : daysLeft <= 7 ? 'bg-amber-500' : 'bg-emerald-500';
                
                return (
                  <div key={member.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-center gap-4 hover:border-slate-300 transition-all cursor-pointer group">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center font-black text-slate-600 uppercase text-lg border border-slate-100">
                        {member.fullName.charAt(0)}
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${statusColor}`}></div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-xs uppercase text-slate-800">{member.fullName}</h4>
                        <span className="text-[8px] font-black uppercase bg-slate-50 px-2 py-0.5 rounded-full text-slate-400">{member.serviceCategory}</span>
                      </div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">{member.phoneNumber} • {daysLeft < 0 ? 'Expired' : `${daysLeft}d left`}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={(e) => { e.stopPropagation(); setEditingMember(member); setFormData({ ...member, phoneNumber: member.phoneNumber.replace('+91',''), paymentReceived: member.totalPaid }); setShowEnrollModal(true); }} className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/${member.phoneNumber.replace(/\D/g,'')}`, '_blank'); }} className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100">
                        <MessageCircle size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'LOGS' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
               <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-slate-400" />
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Activity Logs</h3>
                </div>
                <button onClick={fetchData} className="text-[8px] font-black text-emerald-500 uppercase">Refresh</button>
              </div>
              <div className="divide-y divide-slate-50 max-h-[70vh] overflow-y-auto pr-2 scrollbar-hide">
                {logs.map(log => (
                  <div key={log.id} className="py-4 first:pt-0">
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          log.action.includes('ENROLL') ? 'bg-emerald-500' : 
                          log.action.includes('LOGIN') ? 'bg-blue-500' : 
                          log.action.includes('LOGOUT') ? 'bg-slate-400' : 'bg-amber-500'
                        }`}></span>
                        <p className="text-[10px] font-black uppercase text-slate-800">{log.action}</p>
                      </div>
                      <p className="text-[8px] text-slate-300 font-black">{new Date(log.timestamp).toLocaleTimeString()}</p>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed">{log.details}</p>
                    <p className="text-[8px] text-slate-400 font-black uppercase mt-1">By: {log.userName} ({log.userPhone})</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Modal for Enrollment / Editing */}
        <div className={`fixed inset-0 z-[100] transition-all duration-500 ${showEnrollModal ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={closeEnrollmentFlow}></div>
          <div className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-[40px] shadow-2xl transition-transform duration-500 transform ${showEnrollModal ? 'translate-y-0' : 'translate-y-full'} overflow-y-auto max-h-[90vh] pb-10 p-8`}>
            {!enrollmentSuccess ? (
              <div className="space-y-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-black uppercase">{editingMember ? 'Update Profile' : 'Cloud Entry'}</h2>
                  <button onClick={closeEnrollmentFlow} className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center"><X size={20} /></button>
                </div>
                
                <FormSection title="Member Identity">
                  <input type="text" placeholder="Full Name" value={formData.fullName} onChange={e => setFormData(p => ({...p, fullName: e.target.value}))} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 font-bold" />
                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xs">+91</span>
                    <input type="tel" maxLength={10} value={formData.phoneNumber} onChange={e => setFormData(p => ({...p, phoneNumber: e.target.value.replace(/\D/g, '')}))} className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-14 pr-5 py-4 font-bold" placeholder="Mobile" />
                  </div>
                  {enrollPhoneError && <p className="text-red-500 text-[9px] font-black uppercase">{enrollPhoneError}</p>}
                </FormSection>

                <FormSection title="Service & Payment">
                  <div className="grid grid-cols-2 gap-3">
                    {(['GYM', 'MMA'] as ServiceCategory[]).map(cat => (
                      <button key={cat} onClick={() => setFormData(p => ({...p, serviceCategory: cat}))} className={`py-3 rounded-xl text-[10px] font-black uppercase border ${formData.serviceCategory === cat ? 'bg-slate-900 text-white' : 'bg-white text-slate-400'}`}>{cat}</button>
                    ))}
                  </div>
                  <select value={formData.packageId} onChange={e => setFormData(p => ({...p, packageId: e.target.value}))} className="w-full bg-white border border-slate-100 rounded-2xl px-5 py-4 text-xs font-black">
                    {PACKAGES.filter(p => p.category === formData.serviceCategory).map(pkg => <option key={pkg.id} value={pkg.id}>{pkg.name} — ₹{pkg.price}</option>)}
                  </select>
                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-500 font-black">₹</span>
                    <input type="number" value={formData.paymentReceived} onChange={e => setFormData(p => ({...p, paymentReceived: Number(e.target.value)}))} className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-10 pr-5 py-4 font-black" placeholder="Payment Received" />
                  </div>
                </FormSection>

                <button onClick={handleEnrollment} disabled={isSyncing} className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black shadow-xl flex items-center justify-center gap-3">
                  {isSyncing ? <RefreshCw className="animate-spin" /> : <ChevronRight />}
                  {isSyncing ? 'SYNCING...' : 'SAVE TO CLOUD'}
                </button>
              </div>
            ) : (
              <div className="text-center py-10 space-y-6">
                <div className="bg-emerald-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto text-emerald-500 shadow-inner">
                  <ShieldCheck size={48} />
                </div>
                <h3 className="text-2xl font-black uppercase">Success</h3>
                <p className="text-slate-400 text-[10px] font-bold uppercase">Record updated on all management portals</p>
                <button onClick={closeEnrollmentFlow} className="w-full bg-emerald-500 text-white py-5 rounded-3xl font-black">FINISH</button>
              </div>
            )}
          </div>
        </div>

      </main>
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default App;

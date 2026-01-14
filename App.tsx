import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Header from './components/Header.tsx';
import BottomNav from './components/BottomNav.tsx';
import FormSection from './components/FormSection.tsx';
import { MembershipType, RegistrationData, NavTab, ServiceCategory, Member, MemberTab, User, LogEntry, Gender, ActiveSession } from './types.ts';
import { PACKAGES } from './constants.ts';
import { supabase, SUPABASE_ANON_KEY } from './lib/supabase.ts';
import { 
  Search, Plus, X, ArrowRight, ShieldCheck, MessageCircle, BarChart3, Edit2, RefreshCw, Clock,
  User as UserIcon, Database, Calendar, CalendarDays,
  Cake, Gift, Smartphone, Power, IndianRupee, Mail, CheckCircle2, Lock, Trash2,
  Users, Send
} from 'lucide-react';

// Helper to check environment variables
const getEnv = (key: string): string => {
  // @ts-ignore
  const val = (import.meta.env?.[key]) || (window.process?.env?.[key]) || '';
  return typeof val === 'string' ? val : '';
};

const MASTER_KEY = getEnv('VITE_MASTER_KEY') || '959510';
const MASTER_ADMIN_PHONE = getEnv('VITE_MASTER_ADMIN_PHONE') || '+919595107293';

const MANAGER_NAMES = [
  'Shrikant Sathe',
  'Vishwajeet Bhangare',
  'Radha Shetty'
];

const getDeviceType = () => {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return "Tablet";
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) return "Phone";
  return "PC / Laptop";
};

const getDeviceId = () => {
  let id = localStorage.getItem('thecage_device_uid');
  if (!id) {
    id = 'TC-DEV-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('thecage_device_uid', id);
  }
  return id;
};

const App: React.FC = () => {
  const [managersLoaded, setManagersLoaded] = useState(false);
  const [managerMap, setManagerMap] = useState<Record<string, string>>({});
  const [allowedPhones, setAllowedPhones] = useState<string[]>([]);

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('thecage_session');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [activeTab, setActiveTab] = useState<NavTab>('HOME');
  const [memberTab, setMemberTab] = useState<MemberTab>('ALL');
  const [birthdayTab, setBirthdayTab] = useState<'TODAY' | 'TOMORROW'>('TODAY');
  const [alertCenterTab, setAlertCenterTab] = useState<'RENEWAL' | 'PENDING'>('RENEWAL');
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [enrollmentSuccess, setEnrollmentSuccess] = useState<Member | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [schemaError, setSchemaError] = useState<boolean>(false);

  const [members, setMembers] = useState<Member[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [authorizedDevices, setAuthorizedDevices] = useState<any[]>([]);

  const [loginPhone, setLoginPhone] = useState('');
  const [loginMasterKey, setLoginMasterKey] = useState('');
  const [dbMasterKey, setDbMasterKey] = useState<string | null>(null);
  const [loginError, setLoginError] = useState('');
  const [enrollPhoneError, setEnrollPhoneError] = useState('');
  const [enrollNameError, setEnrollNameError] = useState('');

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const [formData, setFormData] = useState<RegistrationData>({
    fullName: '',
    phoneNumber: '',
    email: '',
    membershipType: MembershipType.SINGLE,
    serviceCategory: ServiceCategory.GYM,
    packageId: PACKAGES[0].id,
    joiningDate: todayStr,
    birthdate: '2000-01-01',
    gender: Gender.MALE,
    paymentReceived: 0,
  });

  const isMasterAdmin = useMemo(() => currentUser?.phoneNumber === MASTER_ADMIN_PHONE, [currentUser]);
  const isConfigMissing = !SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.length < 10;

  useEffect(() => {
    async function loadManagers() {
      if (isConfigMissing) return;
      try {
        const { data, error } = await supabase.from('managers').select('name, phone');
        if (error) throw error;
        if (data && data.length > 0) {
          const map = data.reduce((acc, manager) => {
            acc[manager.phone] = manager.name;
            return acc;
          }, {} as Record<string, string>);
          setManagerMap(map);
          setAllowedPhones(Object.keys(map));
          setManagersLoaded(true);
        } else {
          setManagersLoaded(true);
        }
      } catch (err) {
        setManagersLoaded(true);
      }
    }
    loadManagers();
  }, [isConfigMissing]);

  const getManagerNameByPhone = useCallback((phone: string): string => {
    return managerMap[phone] || 'Unknown Manager';
  }, [managerMap]);

  const addLog = useCallback(async (params: {
    action: string;
    details: string;
    memberId?: string;
    memberName?: string;
    oldValue?: string;
    newValue?: string;
    userOverride?: User;
  }) => {
    const user = params.userOverride || currentUser;
    if (!user || isConfigMissing) return;
    try {
      const { error } = await supabase.from('logs').insert({
        id: Date.now().toString() + Math.random().toString(36).substring(2, 7),
        user_phone: user.phoneNumber,
        user_name: user.name,
        member_id: params.memberId,
        member_name: params.memberName,
        action: params.action,
        details: params.details,
        old_value: params.oldValue,
        new_value: params.newValue,
        timestamp: new Date().toISOString()
      });
      if (error && (error.message.includes('column') || error.message.includes('schema cache'))) {
        setSchemaError(true);
      }
    } catch (err) {
      console.error("Log error:", err);
    }
  }, [currentUser, isConfigMissing]);

  const handleLogout = useCallback(async () => {
    if (currentUser) {
      if (currentUser.sessionId) {
        await supabase.from('sessions').delete().eq('id', currentUser.sessionId);
      }
      await addLog({
        action: 'LOGOUT',
        details: `${currentUser.name} logged out`
      });
    }
    setCurrentUser(null);
    localStorage.removeItem('thecage_session');
  }, [currentUser, addLog]);

  useEffect(() => {
    const fetchAndRotateConfig = async () => {
      if (isConfigMissing) return;
      try {
        const { data, error } = await supabase
          .from('master_key_storage')
          .select('value, updated_at')
          .eq('key', 'master_key')
          .maybeSingle();
        if (error) throw error;
        if (data) {
          setDbMasterKey(data.value);
          setLoginMasterKey(data.value);
        }
      } catch (err) {
        const FALLBACK_MASTER_KEY = MASTER_KEY || '123456';
        setDbMasterKey(FALLBACK_MASTER_KEY);
        setLoginMasterKey(FALLBACK_MASTER_KEY);
      }
    };
    fetchAndRotateConfig();
  }, [isConfigMissing]);

  const getRemainingDays = (expiryDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const validateName = (name: string) => {
    const nameRegex = /^[a-zA-Z\s]*$/;
    if (!nameRegex.test(name)) {
      setEnrollNameError('Enter valid name (Letters only)');
      return false;
    }
    setEnrollNameError('');
    return true;
  };

  const validatePhone = (phone: string) => {
    const phoneRegex = /^[0-9]*$/;
    if (!phoneRegex.test(phone)) {
      setEnrollPhoneError('Enter valid number (Digits only)');
      return false;
    }
    setEnrollPhoneError('');
    return true;
  };

  const formatDateString = (dateString: string) => {
    if (!dateString) return 'Invalid Date';
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const birthdayData = useMemo(() => {
    const today = new Date();
    const tDay = today.getDate();
    const tMonth = today.getMonth();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    const tmDay = tomorrow.getDate();
    const tmMonth = tomorrow.getMonth();

    const bToday = members.filter(m => {
      if (!m.birthdate) return false;
      const d = new Date(m.birthdate);
      return d.getDate() === tDay && d.getMonth() === tMonth;
    });
    const bTomorrow = members.filter(m => {
      if (!m.birthdate) return false;
      const d = new Date(m.birthdate);
      return d.getDate() === tmDay && d.getMonth() === tmMonth;
    });
    return { bToday, bTomorrow };
  }, [members]);

  const filteredPackagesForForm = useMemo(() => {
    return PACKAGES.filter(p => 
      p.category === formData.serviceCategory && 
      p.isCoupleOnly === (formData.membershipType === MembershipType.COUPLE)
    );
  }, [formData.serviceCategory, formData.membershipType]);

  useEffect(() => {
    if (filteredPackagesForForm.length > 0) {
      const exists = filteredPackagesForForm.find(p => p.id === formData.packageId);
      if (!exists) {
        setFormData(prev => ({ ...prev, packageId: filteredPackagesForForm[0].id }));
      }
    }
  }, [filteredPackagesForForm, formData.packageId]);

  const selectedPackageData = useMemo(() => {
    return PACKAGES.find(p => p.id === formData.packageId) || PACKAGES[0];
  }, [formData.packageId]);

  const pendingAmount = useMemo(() => {
    const received = Number(formData.paymentReceived) || 0;
    return selectedPackageData.price - received;
  }, [selectedPackageData.price, formData.paymentReceived]);

  const calculatedExpiryDate = useMemo(() => {
    if (!formData.joiningDate) return '';
    const joining = new Date(formData.joiningDate);
    const expiry = new Date(joining);
    expiry.setDate(expiry.getDate() + selectedPackageData.durationDays);
    return expiry.toISOString().split('T')[0];
  }, [formData.joiningDate, selectedPackageData.durationDays]);

  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      const matchSearch = m.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || m.phoneNumber.includes(searchQuery);
      const daysLeft = getRemainingDays(m.expiryDate);
      switch (memberTab) {
        case 'ACTIVE': return matchSearch && daysLeft >= 0;
        case 'INACTIVE': return matchSearch && daysLeft < 0;
        case '7DAYS': return matchSearch && daysLeft >= 0 && daysLeft <= 7;
        case '15DAYS': return matchSearch && daysLeft > 7 && daysLeft <= 15;
        default: return matchSearch;
      }
    });
  }, [members, searchQuery, memberTab]);

  const homeReminders = useMemo(() => {
    const activeMembers = members.filter(m => getRemainingDays(m.expiryDate) >= 0);
    const m7 = activeMembers.filter(m => {
      const d = getRemainingDays(m.expiryDate);
      return d >= 0 && d <= 7;
    });
    const m15 = activeMembers.filter(m => {
      const d = getRemainingDays(m.expiryDate);
      return d > 7 && d <= 15;
    });
    const pending = members.filter(m => (m.totalFee - m.totalPaid) > 0);
    return { m7, m15, pending };
  }, [members]);

  const revenueStats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const monthlyData: { month: string, revenue: number }[] = [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
      const m = d.getMonth();
      const y = d.getFullYear();
      const monthlyRevenue = members.reduce((sum, member) => {
        const joinDate = new Date(member.joiningDate);
        if (joinDate.getMonth() === m && joinDate.getFullYear() === y) return sum + member.totalPaid;
        return sum;
      }, 0);
      monthlyData.push({ month: `${monthNames[m]} ${y}`, revenue: monthlyRevenue });
    }
    const currentMonthRevenue = monthlyData[monthlyData.length - 1]?.revenue || 0;
    const currentMonthLabel = `${monthNames[currentMonth]} ${currentYear}`;
    return { monthlyData, currentMonthRevenue, currentMonthLabel };
  }, [members]);

  const totalPendingFees = useMemo(() => {
    return members.reduce((sum, m) => sum + (m.totalFee - m.totalPaid), 0);
  }, [members]);

  const logsByDay = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    return {
      today: logs.filter(l => new Date(l.timestamp) >= today),
      earlier: logs.filter(l => new Date(l.timestamp) < today)
    };
  }, [logs]);

  const fetchData = useCallback(async () => {
    if (!currentUser || isConfigMissing) return;
    setIsSyncing(true);
    setConnectionError(null);
    setSchemaError(false);
    try {
      const { data: membersData, error: mError } = await supabase.from('members').select('*').order('updated_at', { ascending: false });
      if (mError) throw mError;
      if (membersData) {
        setMembers(membersData.map(m => ({
          id: m.id,
          fullName: m.full_name,
          phoneNumber: m.phone_number,
          email: m.email,
          membershipType: m.membership_type as MembershipType,
          serviceCategory: m.service_category as ServiceCategory,
          packageId: m.package_id,
          joiningDate: m.joining_date,
          expiryDate: m.expiry_date,
          birthdate: m.birthdate || '2000-01-01',
          gender: (m.gender as Gender) || Gender.MALE,
          totalPaid: Number(m.total_paid || 0),
          totalFee: Number(m.total_fee || 0),
          welcomeSent: !!m.welcome_sent,
          reminderCount: Number(m.reminder_count || 0)
        })));
      }
      const { data: logsData, error: lError } = await supabase.from('logs').select('*').order('timestamp', { ascending: false }).limit(200);
      if (lError) throw lError;
      if (logsData) {
        setLogs(logsData.map(l => ({
          id: l.id,
          userName: l.user_name || 'System',
          userPhone: l.user_phone || 'System',
          memberId: l.member_id,
          memberName: l.member_name,
          action: l.action,
          details: l.details,
          oldValue: l.old_value,
          newValue: l.new_value,
          timestamp: l.timestamp
        })));
      }
      const { data: sessionData } = await supabase.from('sessions').select('*').order('login_time', { ascending: false });
      if (sessionData) setSessions(sessionData as ActiveSession[]);
      if (isMasterAdmin) {
        const { data: devData } = await supabase.from('authorized_devices').select('*');
        if (devData) setAuthorizedDevices(devData);
      }
    } catch (err: any) {
      setConnectionError(err.message || 'Connection Error');
    } finally {
      setIsSyncing(false);
    }
  }, [currentUser, isConfigMissing, isMasterAdmin]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!managersLoaded) { setLoginError('Loading manager data...'); return; }
    const phoneClean = loginPhone.replace(/\D/g, '');
    const phone10 = phoneClean.slice(-10);
    const fullPhone = `+91${phone10}`;
    const activeMasterKey = dbMasterKey || MASTER_KEY;
    const currentDeviceId = getDeviceId();
    if (loginMasterKey === activeMasterKey && allowedPhones.includes(fullPhone)) {
      setIsSyncing(true);
      try {
        const { data: binding } = await supabase.from('authorized_devices').select('*').eq('user_phone', fullPhone).maybeSingle();
        if (!binding) {
          await supabase.from('authorized_devices').insert({ user_phone: fullPhone, device_id: currentDeviceId });
        } else if (binding.device_id !== currentDeviceId && fullPhone !== MASTER_ADMIN_PHONE) {
          setLoginError("Hardware binding mismatch.");
          setIsSyncing(false);
          return;
        }
        const derivedName = getManagerNameByPhone(fullPhone);
        const { data, error } = await supabase.from('sessions').insert({ user_phone: fullPhone, user_name: derivedName, device_type: getDeviceType(), device_id: currentDeviceId, login_time: new Date().toISOString() }).select().single();
        if (error) throw error;
        const user: User = { phoneNumber: fullPhone, name: derivedName, sessionId: data.id, loginTime: data.login_time };
        setCurrentUser(user);
        localStorage.setItem('thecage_session', JSON.stringify(user));
        await addLog({ action: 'SECURE_LOGIN', details: `${user.name} logged in`, userOverride: user });
      } catch (err: any) {
        setLoginError("Login failed: " + err.message);
      } finally {
        setIsSyncing(false);
      }
    } else {
      setLoginError('INVALID CREDENTIALS OR PHONE');
    }
  };

  useEffect(() => {
    if (!currentUser?.sessionId || isConfigMissing) return;
    const heartbeat = setInterval(async () => {
      await supabase.from('sessions').update({ last_active: new Date().toISOString() }).eq('id', currentUser.sessionId);
    }, 30000);
    return () => clearInterval(heartbeat);
  }, [currentUser?.sessionId, isConfigMissing]);

  useEffect(() => {
    if (!currentUser || isConfigMissing) return;
    fetchData();
  }, [currentUser, fetchData, isConfigMissing]);

  const removeSession = async (sessionId: string, userName: string) => {
    if (!isMasterAdmin) return;
    if (!confirm(`Log out ${userName}'s device?`)) return;
    try {
      await supabase.from('sessions').delete().eq('id', sessionId);
      fetchData();
    } catch (e) {}
  };

  const logoutAllExceptMe = async () => {
    if (!isMasterAdmin) return;
    const others = sessions.filter(s => s.id !== currentUser?.sessionId).map(s => s.id);
    if (others.length > 0) {
      await supabase.from('sessions').delete().in('id', others);
      fetchData();
    }
  };

  const resetHardwareBinding = async (userPhone: string, userName: string) => {
    if (!isMasterAdmin) return;
    if (!confirm(`Unbind ${userName}'s phone?`)) return;
    await supabase.from('authorized_devices').delete().eq('user_phone', userPhone);
    fetchData();
  };

  const closeEnrollmentFlow = () => {
    setShowEnrollModal(false); setEnrollmentSuccess(null); setEditingMember(null); setEnrollPhoneError(''); setEnrollNameError('');
    setFormData({ fullName: '', phoneNumber: '', email: '', membershipType: MembershipType.SINGLE, serviceCategory: ServiceCategory.GYM, packageId: PACKAGES[0].id, joiningDate: todayStr, birthdate: '2000-01-01', gender: Gender.MALE, paymentReceived: 0 });
  };

  const handleEnrollment = async () => {
    if (!formData.fullName.trim() || formData.phoneNumber.replace(/\D/g, '').length !== 10) return;
    setIsSyncing(true);
    const joining = new Date(formData.joiningDate);
    const expiry = new Date(joining);
    expiry.setDate(expiry.getDate() + selectedPackageData.durationDays);
    const memberData: any = { id: editingMember?.id || Date.now().toString(), full_name: formData.fullName, phone_number: `+91${formData.phoneNumber.replace(/\D/g, '')}`, email: formData.email, membership_type: formData.membershipType, service_category: formData.serviceCategory, package_id: formData.packageId, joining_date: joining.toISOString(), expiry_date: expiry.toISOString(), birthdate: formData.birthdate, gender: formData.gender, total_paid: Number(formData.paymentReceived), total_fee: selectedPackageData.price, updated_at: new Date().toISOString() };
    try {
      await supabase.from('members').upsert(memberData);
      await addLog({ action: editingMember ? 'MEMBER_UPDATE' : 'MEMBER_ENROLL', details: `Member ${memberData.full_name} processed`, memberId: memberData.id, memberName: memberData.full_name });
      if (!editingMember) setEnrollmentSuccess({ ...memberData, fullName: memberData.full_name, phoneNumber: memberData.phone_number, welcomeSent: false, reminderCount: 0 });
      else closeEnrollmentFlow();
      fetchData();
    } catch (e) { alert("Error syncing."); }
    finally { setIsSyncing(false); }
  };

  const updateMemberMessageStatus = async (memberId: string, updates: { welcome_sent?: boolean; reminder_count?: number }) => {
    if (schemaError) return;
    await supabase.from('members').update(updates).eq('id', memberId);
    fetchData();
  };

  const sendBirthdayWish = (member: Member) => {
    const phone = member.phoneNumber.replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=Happy Birthday!`, '_blank');
  };

  const sendWhatsAppReminder = (member: Member, type: 'expiry' | 'pending' | 'welcome') => {
    const phone = member.phoneNumber.replace(/\D/g, '');
    let text = `Reminder from The Cage for ${member.fullName}`;
    if (type === 'welcome') updateMemberMessageStatus(member.id, { welcome_sent: true });
    else updateMemberMessageStatus(member.id, { reminder_count: (member.reminderCount || 0) + 1 });
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (isConfigMissing) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-white p-10 rounded-[40px] shadow-2xl space-y-6">
        <Database size={40} className="mx-auto text-amber-500" />
        <h2 className="text-2xl font-black uppercase text-slate-800">Setup Required</h2>
      </div>
    </div>
  );

  if (!currentUser) return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white p-10 rounded-[40px] shadow-2xl">
        <ShieldCheck size={32} className="mx-auto text-emerald-500 mb-6" />
        <h2 className="text-2xl font-black text-center uppercase mb-8">Sign In</h2>
        <div className="mb-6 flex gap-2 overflow-x-auto">
          {MANAGER_NAMES.map((name, i) => (
            <button key={i} onClick={() => {
              const phone = Object.entries(managerMap).find(([, n]) => n === name)?.[0];
              if (phone) setLoginPhone(phone.replace('+91', ''));
            }} className="px-4 py-2 bg-slate-50 border rounded-xl text-[10px] font-bold whitespace-nowrap">{name}</button>
          ))}
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <input type="tel" value={loginPhone} onChange={e => setLoginPhone(e.target.value)} className="w-full bg-slate-50 border p-4 rounded-xl font-bold" placeholder="Manager Phone" />
          <input type="password" value={loginMasterKey} onChange={e => setLoginMasterKey(e.target.value)} className="w-full bg-slate-50 border p-4 rounded-xl font-bold" placeholder="Master Key" />
          <button disabled={isSyncing} className="w-full bg-emerald-500 text-white p-4 rounded-xl font-black shadow-lg">
            {isSyncing ? 'LOADING...' : 'AUTHENTICATE'}
          </button>
          {loginError && <p className="text-red-500 text-[10px] text-center">{loginError}</p>}
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      <Header user={currentUser} onLogout={handleLogout} />
      <main className="max-w-2xl mx-auto px-4 pt-8">
        {activeTab === 'HOME' && (
          <div className="space-y-6">
            <button onClick={() => setShowEnrollModal(true)} className="w-full bg-slate-900 text-white rounded-3xl p-6 flex items-center justify-between shadow-xl">
              <div className="flex items-center gap-4">
                <Plus size={24} className="bg-emerald-500 p-1 rounded-lg" />
                <span className="font-black uppercase text-sm">Enroll New Member</span>
              </div>
              <ArrowRight size={20} />
            </button>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col justify-between h-32">
                <span className="text-slate-400 font-bold text-[9px] uppercase tracking-widest">Active Pool</span>
                <span className="text-3xl font-black">{members.length}</span>
              </div>
              <div className="bg-emerald-500 p-6 rounded-3xl shadow-lg h-32 flex flex-col justify-between text-white">
                <span className="font-bold text-[9px] uppercase tracking-widest">Monthly Cash</span>
                <span className="text-3xl font-black">₹{revenueStats.currentMonthRevenue.toLocaleString()}</span>
              </div>
            </div>
            <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
               <h3 className="text-lg font-black uppercase text-slate-800">Birthdays</h3>
               {birthdayData.bToday.map(m => (
                 <div key={m.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                   <span className="text-sm font-black">{m.fullName}</span>
                   <button onClick={() => sendBirthdayWish(m)} className="p-2 bg-pink-500 text-white rounded-lg"><Gift size={14} /></button>
                 </div>
               ))}
               {birthdayData.bToday.length === 0 && <p className="text-[10px] text-slate-300 font-bold text-center">NO BIRTHDAYS TODAY</p>}
            </div>
          </div>
        )}

        {activeTab === 'MEMBERS' && (
          <div className="space-y-6">
            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="text" placeholder="Search members..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-white border p-4 pl-12 rounded-2xl font-bold shadow-sm" />
            </div>
            <div className="space-y-3">
              {filteredMembers.map(m => (
                <div key={m.id} className="bg-white p-4 rounded-2xl border shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-500 text-white rounded-xl flex items-center justify-center font-black">{m.fullName.charAt(0)}</div>
                    <div>
                      <h4 className="font-black text-sm uppercase">{m.fullName}</h4>
                      <p className="text-[10px] font-bold text-slate-400">{m.phoneNumber}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingMember(m); setFormData({ ...m, phoneNumber: m.phoneNumber.replace('+91',''), paymentReceived: m.totalPaid }); setShowEnrollModal(true); }} className="p-2 bg-slate-50 rounded-xl"><Edit2 size={16} /></button>
                    {isMasterAdmin && !m.welcomeSent && <button onClick={() => sendWhatsAppReminder(m, 'welcome')} className="p-2 bg-indigo-500 text-white rounded-xl"><Send size={16} /></button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'LOGS' && (
          <div className="space-y-4">
            {logs.map(l => (
              <div key={l.id} className="bg-white p-4 rounded-2xl border shadow-sm">
                <div className="flex justify-between mb-1">
                  <span className="text-[9px] font-black uppercase text-emerald-500">{l.action}</span>
                  <span className="text-[9px] text-slate-300">{new Date(l.timestamp).toLocaleTimeString()}</span>
                </div>
                <p className="text-xs font-bold text-slate-600">{l.details}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'DEVICES' && (
          <div className="space-y-4">
            {sessions.map(s => (
              <div key={s.id} className="bg-white p-4 rounded-2xl border shadow-sm flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-black uppercase">{s.user_name}</h4>
                  <p className="text-[10px] text-slate-400">{s.device_type}</p>
                </div>
                {isMasterAdmin && s.id !== currentUser?.sessionId && (
                  <button onClick={() => removeSession(s.id, s.user_name)} className="p-2 bg-red-50 text-red-500 rounded-xl"><Power size={16} /></button>
                )}
              </div>
            ))}
            {isMasterAdmin && (
              <div className="mt-8 space-y-2">
                 <h3 className="text-xs font-black uppercase">Hardware Links</h3>
                 {authorizedDevices.map(d => (
                   <div key={d.id} className="p-4 bg-slate-50 border rounded-2xl flex justify-between">
                     <span className="text-[10px] font-bold">{d.user_phone}</span>
                     <button onClick={() => resetHardwareBinding(d.user_phone, d.user_phone)} className="text-red-500"><Trash2 size={14} /></button>
                   </div>
                 ))}
              </div>
            )}
          </div>
        )}
      </main>

      {showEnrollModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-t-[40px] p-8 pb-12 shadow-2xl overflow-y-auto max-h-[90vh]">
            {!enrollmentSuccess ? (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-black uppercase">{editingMember ? 'Update' : 'Enrollment'}</h2>
                  <button onClick={closeEnrollmentFlow} className="p-2"><X size={20} /></button>
                </div>
                <FormSection title="Member Info">
                  <input type="text" placeholder="Full Name" value={formData.fullName} onChange={e => { if (validateName(e.target.value)) setFormData(prev => ({...prev, fullName: e.target.value})); }} className="w-full bg-slate-50 border p-4 rounded-xl font-bold" />
                  <input type="tel" placeholder="WhatsApp 10 digits" maxLength={10} value={formData.phoneNumber} onChange={e => { if (validatePhone(e.target.value)) setFormData(prev => ({...prev, phoneNumber: e.target.value})); }} className="w-full bg-slate-50 border p-4 rounded-xl font-bold" />
                  <input type="date" value={formData.joiningDate} onChange={e => setFormData(prev => ({...prev, joiningDate: e.target.value}))} className="w-full bg-slate-50 border p-4 rounded-xl font-bold" />
                </FormSection>
                <FormSection title="Financial">
                  <input type="number" placeholder="Paid Amount" value={formData.paymentReceived === 0 ? '' : formData.paymentReceived} onChange={e => setFormData(prev => ({...prev, paymentReceived: Number(e.target.value)}))} className="w-full bg-slate-50 border p-4 rounded-xl font-bold" />
                </FormSection>
                <button onClick={handleEnrollment} disabled={isSyncing} className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black shadow-xl">
                  {isSyncing ? 'SYNCING...' : (editingMember ? 'UPDATE' : 'ENROLL')}
                </button>
              </div>
            ) : (
              <div className="text-center space-y-6">
                <CheckCircle2 size={64} className="mx-auto text-emerald-500" />
                <h3 className="text-xl font-black">Success</h3>
                <button onClick={closeEnrollmentFlow} className="w-full bg-emerald-500 text-white p-5 rounded-2xl font-black">DONE</button>
              </div>
            )}
          </div>
        </div>
      )}

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default App;

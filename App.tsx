
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header.tsx';
import BottomNav from './components/BottomNav.tsx';
import FormSection from './components/FormSection.tsx';
import { MembershipType, RegistrationData, NavTab, ServiceCategory, Member, MemberTab, User, LogEntry, Gender, ActiveSession } from './types.ts';
import { PACKAGES } from './constants.ts';
import { supabase, SUPABASE_ANON_KEY } from './lib/supabase.ts';
import { 
  Search, Plus, X, ArrowRight, ShieldCheck, MessageCircle, BarChart3, Edit2, RefreshCw, Clock,
  User as UserIcon, Database, UserCheck, Calendar, CalendarDays, AlertCircle,
  Bell, AlertOctagon, CheckCircle2, Send, Cake, Gift, Smartphone, ShieldAlert, Power,
  Monitor, Tablet, IndianRupee, Mail
} from 'lucide-react';

const FALLBACK_MASTER_KEY = '959510';
const MASTER_ADMIN_PHONE = '+919595107293';

const MANAGER_MAP: Record<string, string> = {
  '9130368298': 'Shrikanth Sir',
  '9595107293': 'Vishwajeet Sir',
  '9823733536': 'Radha Mam'
};

const ALLOWED_MANAGEMENT_PHONES = Object.keys(MANAGER_MAP);

const getDeviceType = () => {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return "Tablet";
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) return "Phone";
  return "PC / Laptop";
};

const getDeviceId = () => {
  let id = localStorage.getItem('thecage_device_uid');
  if (!id) {
    id = 'UID-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('thecage_device_uid', id);
  }
  return id;
};

const App: React.FC = () => {
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

  const isMasterAdmin = currentUser?.phoneNumber === MASTER_ADMIN_PHONE;
  const isConfigMissing = SUPABASE_ANON_KEY.includes('YOUR_ACTUAL_LONG');

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
  }, [currentUser]);

  const addLog = async (params: {
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

    const logId = Date.now().toString() + Math.random().toString(36).substring(2, 7);
    
    try {
      // Fix: Corrected property access to use camelCase 'oldValue' and 'newValue' from params.
      const { error } = await supabase.from('logs').insert({
        id: logId,
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
  };

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
          const now = new Date();
          const istNow = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
          
          const recentSunday = new Date(istNow);
          recentSunday.setDate(istNow.getDate() - istNow.getDay());
          recentSunday.setHours(5, 5, 0, 0);

          if (istNow < recentSunday) {
            recentSunday.setDate(recentSunday.getDate() - 7);
          }

          const lastRotatedIST = new Date(new Date(data.updated_at).toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));

          if (lastRotatedIST < recentSunday) {
            const newKey = Math.floor(100000 + Math.random() * 900000).toString();
            const { error: updateError } = await supabase
              .from('master_key_storage')
              .update({ value: newKey, updated_at: now.toISOString() })
              .eq('key', 'master_key');
            
            if (!updateError) {
              setDbMasterKey(newKey);
              setLoginMasterKey(newKey);
            }
          } else {
            setDbMasterKey(data.value);
            setLoginMasterKey(data.value);
          }
        }
      } catch (err) {
        console.warn("master_key_storage fetch error, using fallback.", err);
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
        if (joinDate.getMonth() === m && joinDate.getFullYear() === y) {
          return sum + member.totalPaid;
        }
        return sum;
      }, 0);

      monthlyData.push({
        month: `${monthNames[m]} ${y}`,
        revenue: monthlyRevenue
      });
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
      const { data: membersData, error: mError } = await supabase
        .from('members')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (mError) {
        if (mError.message.includes('column') || mError.message.includes('schema cache')) setSchemaError(true);
        throw mError;
      }

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
          expiry_date: m.expiry_date,
          birthdate: m.birthdate || '2000-01-01',
          gender: (m.gender as Gender) || Gender.MALE,
          totalPaid: Number(m.total_paid || 0),
          totalFee: Number(m.total_fee || 0),
          welcomeSent: !!m.welcome_sent,
          reminderCount: Number(m.reminder_count || 0)
        })));
      }

      const { data: logsData, error: lError } = await supabase
        .from('logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(200);
      
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

      const { data: sessionData } = await supabase
        .from('sessions')
        .select('*')
        .order('login_time', { ascending: false });
      
      if (sessionData) {
        setSessions(sessionData as ActiveSession[]);
      }
    } catch (err: any) {
      const errMsg = err.message || JSON.stringify(err);
      if (errMsg.includes('column') || errMsg.includes('schema cache')) setSchemaError(true);
      setConnectionError(err.message === 'Unauthorized' ? 'Invalid API Key' : errMsg || 'Connection Error');
    } finally {
      setIsSyncing(false);
    }
  }, [currentUser, isConfigMissing]);

  useEffect(() => {
    if (!currentUser?.sessionId || isConfigMissing) return;

    const sessionChannel = supabase.channel(`session-${currentUser.sessionId}`)
      .on('postgres_changes', { 
        event: 'DELETE', 
        schema: 'public', 
        table: 'sessions', 
        filter: `id=eq.${currentUser.sessionId}` 
      }, () => {
        handleLogout();
        alert("SECURITY: Your session was disconnected (Scheduled Sunday 5:00 AM logout or Admin action).");
      })
      .subscribe();

    const heartbeat = setInterval(async () => {
      const istNow = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
      if (istNow.getDay() === 0 && istNow.getHours() === 5 && istNow.getMinutes() === 0) {
        await supabase.from('sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        handleLogout();
        return;
      }
      await supabase.from('sessions')
        .update({ last_active: new Date().toISOString() })
        .eq('id', currentUser.sessionId);
    }, 30000);

    return () => { 
      supabase.removeChannel(sessionChannel);
      clearInterval(heartbeat);
    };
  }, [currentUser?.sessionId, isConfigMissing, handleLogout]);

  useEffect(() => {
    if (!currentUser || isConfigMissing) return;
    fetchData();
    const channel = supabase.channel('global-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => fetchData())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'logs' }, (payload) => {
        const l = payload.new as any;
        setLogs(prev => [{
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
        }, ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUser, fetchData, isConfigMissing]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const phoneClean = loginPhone.replace(/\D/g, '');
    const phone10 = phoneClean.slice(-10);
    const activeMasterKey = dbMasterKey || FALLBACK_MASTER_KEY;
    
    if (loginMasterKey === activeMasterKey && ALLOWED_MANAGEMENT_PHONES.includes(phone10)) {
      setIsSyncing(true);
      const derivedName = MANAGER_MAP[phone10];
      let ip = 'Unknown';
      try {
        const ipRes = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipRes.json();
        ip = ipData.ip;
      } catch (err) { console.error("IP Fetch failed", err); }

      const sessionObj = {
        user_phone: `+91${phone10}`,
        user_name: derivedName,
        device_type: getDeviceType(),
        ip_address: ip,
        device_id: getDeviceId(),
        login_time: new Date().toISOString()
      };

      try {
        const { data, error } = await supabase.from('sessions').insert(sessionObj).select().single();
        if (error) throw error;
        const user: User = { phoneNumber: sessionObj.user_phone, name: derivedName, sessionId: data.id, loginTime: sessionObj.login_time };
        setCurrentUser(user);
        localStorage.setItem('thecage_session', JSON.stringify(user));
        await addLog({ action: 'LOGIN', details: `${user.name} logged in from ${sessionObj.device_type} (IP: ${ip})`, userOverride: user });
      } catch (err: any) {
        alert("Session Login Error: " + err.message);
      } finally {
        setIsSyncing(false);
      }
    } else {
      setLoginError('INVALID CREDENTIALS OR PHONE');
    }
  };

  const removeSession = async (sessionId: string, userName: string) => {
    if (!isMasterAdmin) return;
    if (!confirm(`Log out ${userName}'s device immediately?`)) return;
    setIsSyncing(true);
    try {
      const { error } = await supabase.from('sessions').delete().eq('id', sessionId);
      if (error) throw error;
      await addLog({ action: 'ADMIN_FORCE_LOGOUT', details: `Master Admin disconnected ${userName}'s device` });
      fetchData();
    } catch (err: any) {
      alert("Failed to disconnect: " + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const logoutAllExceptMe = async () => {
    if (!isMasterAdmin) return;
    if (!confirm(`Log out all other active devices?`)) return;
    setIsSyncing(true);
    try {
      const others = sessions.filter(s => s.id !== currentUser?.sessionId).map(s => s.id);
      if (others.length > 0) {
        const { error } = await supabase.from('sessions').delete().in('id', others);
        if (error) throw error;
        await addLog({ action: 'ADMIN_LOGOUT_ALL', details: `Master Admin disconnected all other ${others.length} devices` });
      }
      fetchData();
    } catch (err: any) {
      alert("Failed to disconnect others: " + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleEnrollment = async () => {
    setEnrollNameError('');
    setEnrollPhoneError('');
    
    if (!formData.fullName.trim()) { 
      setEnrollNameError('FULL NAME IS MANDATORY'); 
      return; 
    }
    
    const phoneDigits = formData.phoneNumber.replace(/\D/g, '');
    if (phoneDigits.length !== 10) { 
      setEnrollPhoneError('VALID 10-DIGIT WHATSAPP NUMBER IS MANDATORY'); 
      return; 
    }

    const paidVal = Number(formData.paymentReceived);
    if (isNaN(paidVal) || paidVal < 0) { 
      alert("Paid amount must be a valid number and cannot be less than 0"); 
      return; 
    }

    setIsSyncing(true);
    const joining = new Date(formData.joiningDate);
    const pkg = selectedPackageData;
    const expiry = new Date(joining);
    expiry.setDate(expiry.getDate() + pkg.durationDays);

    const memberData: any = {
      id: editingMember?.id || Date.now().toString(),
      full_name: formData.fullName,
      phone_number: `+91${phoneDigits}`,
      email: formData.email,
      membership_type: formData.membershipType,
      service_category: formData.serviceCategory,
      package_id: formData.packageId,
      joining_date: joining.toISOString(),
      expiry_date: expiry.toISOString(),
      birthdate: formData.birthdate,
      gender: formData.gender,
      total_paid: paidVal,
      total_fee: pkg.price,
      updated_at: new Date().toISOString()
    };

    if (!schemaError && editingMember) {
      memberData.welcome_sent = editingMember.welcomeSent;
      memberData.reminder_count = editingMember.reminderCount;
    }

    try {
      const { error } = await supabase.from('members').upsert(memberData);
      if (error) throw error;
      
      if (editingMember) {
        const diffsOld: string[] = [];
        const diffsNew: string[] = [];
        
        if (editingMember.fullName !== memberData.full_name) { diffsOld.push(`Name: ${editingMember.fullName}`); diffsNew.push(`Name: ${memberData.full_name}`); }
        if (editingMember.totalPaid !== memberData.total_paid) { diffsOld.push(`Paid: ₹${editingMember.totalPaid}`); diffsNew.push(`Paid: ₹${memberData.total_paid}`); }
        if (editingMember.serviceCategory !== memberData.service_category) { diffsOld.push(`Cat: ${editingMember.serviceCategory}`); diffsNew.push(`Cat: ${memberData.service_category}`); }
        if (editingMember.membershipType !== memberData.membership_type) { diffsOld.push(`Type: ${editingMember.membership_type}`); diffsNew.push(`Type: ${memberData.membership_type}`); }
        if (editingMember.packageId !== memberData.package_id) { 
           const oldP = PACKAGES.find(p => p.id === editingMember.packageId)?.name || 'N/A';
           const newP = PACKAGES.find(p => p.id === memberData.package_id)?.name || 'N/A';
           diffsOld.push(`Plan: ${oldP}`); diffsNew.push(`Plan: ${newP}`); 
        }
        
        await addLog({ 
          action: 'MEMBER_UPDATE', 
          details: `${currentUser?.name} updated ${memberData.full_name}`, 
          memberId: memberData.id, 
          memberName: memberData.full_name,
          oldValue: diffsOld.join(', ') || 'No critical changes',
          newValue: diffsNew.join(', ') || 'Record synchronized'
        });
      } else {
        await addLog({ 
          action: 'MEMBER_ENROLL', 
          details: `${currentUser?.name} enrolled ${memberData.full_name}`, 
          memberId: memberData.id, 
          memberName: memberData.full_name,
          newValue: `Plan: ${PACKAGES.find(p => p.id === memberData.package_id)?.name}, Paid: ₹${memberData.total_paid}`
        });
      }
      
      if (!editingMember) {
        setEnrollmentSuccess({ id: memberData.id, fullName: memberData.full_name, phoneNumber: memberData.phone_number, email: memberData.email, membershipType: memberData.membership_type as MembershipType, serviceCategory: memberData.service_category as ServiceCategory, packageId: memberData.package_id, joiningDate: memberData.joining_date, expiryDate: memberData.expiry_date, birthdate: memberData.birthdate, gender: memberData.gender as Gender, totalPaid: memberData.total_paid, totalFee: memberData.total_fee, welcomeSent: false, reminderCount: 0 });
      } else { closeEnrollmentFlow(); }
    } catch (err: any) {
      alert('Sync Error: ' + (err.message || JSON.stringify(err)));
    } finally { setIsSyncing(false); }
  };

  const closeEnrollmentFlow = () => {
    setShowEnrollModal(false); setEnrollmentSuccess(null); setEditingMember(null); setEnrollPhoneError(''); setEnrollNameError('');
    setFormData({ fullName: '', phoneNumber: '', email: '', membershipType: MembershipType.SINGLE, serviceCategory: ServiceCategory.GYM, packageId: PACKAGES[0].id, joiningDate: todayStr, birthdate: '2000-01-01', gender: Gender.MALE, paymentReceived: 0 });
  };

  const updateMemberMessageStatus = async (memberId: string, updates: { welcome_sent?: boolean; reminder_count?: number }) => {
    if (schemaError) return;
    try {
      const { error } = await supabase.from('members').update(updates).eq('id', memberId);
      if (error) throw error;
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, welcomeSent: updates.welcome_sent !== undefined ? updates.welcome_sent : m.welcomeSent, reminderCount: updates.reminder_count !== undefined ? updates.reminder_count : m.reminderCount } : m));
    } catch (err: any) { console.error("Update failed:", err); }
  };

  const sendBirthdayWish = (member: Member) => {
    const phone = member.phoneNumber.replace(/\D/g, '');
    const text = `*Warmest Birthday Greetings!* 🎂\n\nDear ${member.fullName},\n\nWarmest birthday greetings from all of us at *The Cage MMA-Gym & RS Fitness Academy!*\n\nMay your day be as incredible as your dedication to fitness. Wishing you a year ahead filled with strength, health, success, and prosperity. We are proud to have you as a valued member of our fitness community. 💪\n\nBest Regards,\nThe Management Team\nThe Cage MMA-Gym & RS Fitness Academy`;
    addLog({ action: 'BIRTHDAY_WISH', details: `Birthday wish sent to ${member.fullName}`, memberId: member.id, memberName: member.fullName });
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const sendWhatsAppReminder = (member: Member, type: 'expiry' | 'pending' | 'welcome') => {
    const phone = member.phoneNumber.replace(/\D/g, '');
    let text = '';
    if (type === 'welcome') {
      if (member.welcomeSent) { alert("Already sent."); return; }
      const pkg = PACKAGES.find(p => p.id === member.packageId) || { name: 'Custom' };
      text = `*Hello ${member.fullName}!*\n\nGreetings from The Cage MMA-Gym & RS Fitness Academy. We are excited to have you join our fitness community! 💪\n\nYour Details:\n• Plan: ${member.serviceCategory} (${pkg.name})\n• Joining: ${formatDateString(member.joiningDate)}\n• Expiry: ${formatDateString(member.expiryDate)}\n\nBest Regards,\nThe Cage MMA-Gym & RS Fitness Academy`;
      updateMemberMessageStatus(member.id, { welcome_sent: true });
      addLog({ action: 'WELCOME_SENT', details: `Welcome sent to ${member.fullName}`, memberId: member.id, memberName: member.fullName });
    } else if (type === 'expiry') {
      text = `Hello ${member.fullName}, your membership at The Cage MMA-Gym & RS Fitness Academy expires in ${getRemainingDays(member.expiryDate)} days. Please visit us for renewal!`;
      updateMemberMessageStatus(member.id, { reminder_count: member.reminderCount + 1 });
      addLog({ action: 'EXPIRY_REMINDER', details: `Reminder sent to ${member.fullName}`, memberId: member.id, memberName: member.fullName });
    } else {
      text = `Hello ${member.fullName}, regarding your pending fee of ₹${member.totalFee - member.totalPaid} at The Cage MMA-Gym & RS Fitness Academy. Please clear it soon. Thanks!`;
      updateMemberMessageStatus(member.id, { reminder_count: member.reminderCount + 1 });
      addLog({ action: 'PENDING_REMINDER', details: `Fee reminder sent to ${member.fullName}`, memberId: member.id, memberName: member.fullName });
    }
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (isConfigMissing) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-white p-10 rounded-[40px] shadow-2xl space-y-6">
        <div className="bg-amber-100 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto text-amber-600">
          <Database size={40} />
        </div>
        <h2 className="text-2xl font-black uppercase text-slate-800">Setup Required</h2>
        <p className="text-sm text-slate-500 font-medium leading-relaxed">Missing Supabase API key.</p>
      </div>
    </div>
  );

  if (!currentUser) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-sm bg-white p-10 rounded-[40px] shadow-2xl">
        <div className="bg-emerald-500 w-16 h-16 rounded-3xl flex items-center justify-center mb-8 mx-auto text-white shadow-lg">
          <ShieldCheck size={32} />
        </div>
        <h2 className="text-2xl font-black mb-2 text-center uppercase tracking-tight text-slate-800">Sign In</h2>
        <p className="text-[10px] text-slate-400 font-bold text-center uppercase tracking-widest mb-8">Management Access Only</p>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <UserIcon size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="tel" required value={loginPhone} maxLength={13} onChange={e => setLoginPhone(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-14 pr-5 py-4 font-bold text-black focus:ring-2 focus:ring-emerald-500/50 outline-none" placeholder="Manager Phone" />
          </div>
          <div className="relative">
            <ShieldCheck size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input name="masterKey" type="password" required value={loginMasterKey} onChange={e => setLoginMasterKey(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-14 pr-5 py-4 font-black text-black focus:ring-2 focus:ring-emerald-500/50 outline-none" placeholder="Master Key" />
          </div>
          <button disabled={isSyncing || !dbMasterKey} className="w-full bg-emerald-500 text-white py-5 rounded-3xl font-black active:scale-[0.98] transition-all shadow-lg shadow-emerald-500/20 mt-4 flex items-center justify-center gap-2 disabled:opacity-50">
            {isSyncing ? <RefreshCw className="animate-spin" size={20} /> : 'SUBMIT'}
          </button>
          {!dbMasterKey && !isSyncing && (
            <p className="text-amber-500 text-[10px] font-bold text-center uppercase tracking-widest mt-2 text-center w-full">Connecting to server...</p>
          )}
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-28 text-black">
      <Header user={currentUser} onLogout={handleLogout} />
      <main className="max-w-2xl mx-auto px-4 pt-8">
        {activeTab === 'HOME' && (
          <div className="space-y-6">
            <button onClick={() => setShowEnrollModal(true)} disabled={!!connectionError} className="w-full bg-slate-900 text-white rounded-3xl p-6 flex items-center justify-between shadow-xl group disabled:opacity-50">
              <div className="flex items-center gap-4">
                <div className="bg-emerald-500 p-3 rounded-2xl"><Plus size={24} /></div>
                <div className="text-left"><h4 className="font-black uppercase text-sm tracking-tight">Enroll New Member</h4></div>
              </div>
              <ArrowRight size={20} className="text-slate-700 group-active:translate-x-1 transition-transform" />
            </button>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-emerald-50 text-emerald-500 rounded-lg"><UserIcon size={14} /></div>
                  <span className="text-slate-400 font-bold text-[9px] uppercase tracking-widest">Active Members</span>
                </div>
                <span className="text-2xl font-black text-black">{members.filter(m => getRemainingDays(m.expiryDate) >= 0).length}</span>
              </div>
              <div className="bg-emerald-500 p-6 rounded-3xl shadow-lg shadow-emerald-500/20 flex flex-col justify-between">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-white/20 text-white rounded-lg"><IndianRupee size={14} /></div>
                  <span className="text-white font-bold text-[9px] uppercase tracking-widest">Collection {revenueStats.currentMonthLabel}</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-white">₹{revenueStats.currentMonthRevenue.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="bg-red-500 p-6 rounded-3xl shadow-lg shadow-red-500/20">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-white/20 text-white rounded-lg"><IndianRupee size={14} /></div>
                <span className="text-white font-bold text-[9px] uppercase tracking-widest">Total Pending Fees</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-white">₹{totalPendingFees.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-pink-50 p-2 rounded-xl text-pink-500"><Gift size={18} /></div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-tight text-slate-800">Birthdays</h3>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Celebrate Our Family</p>
                  </div>
                </div>
                <div className="flex bg-slate-50 p-1 rounded-xl">
                  {['TODAY', 'TOMORROW'].map(tab => (
                    <button key={tab} onClick={() => setBirthdayTab(tab as any)} className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${birthdayTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>
                      {tab}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-3 max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
                {(birthdayTab === 'TODAY' ? birthdayData.bToday : birthdayData.bTomorrow).map(member => (
                  <div key={member.id} className="flex items-center justify-between p-3.5 bg-slate-50/50 border border-slate-100 rounded-2xl group transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center border border-slate-100 shadow-sm">
                        <Cake size={16} className="text-pink-400" />
                      </div>
                      <div>
                        <h4 className="text-[10px] font-black uppercase text-slate-800">{member.fullName}</h4>
                        <p className="text-[8px] font-bold text-slate-400 uppercase">{member.phoneNumber}</p>
                      </div>
                    </div>
                    {birthdayTab === 'TODAY' && (
                      <button onClick={() => sendBirthdayWish(member)} className="flex items-center gap-2 px-4 py-2 bg-pink-500 text-white rounded-xl text-[9px] font-black uppercase shadow-lg shadow-pink-500/20 active:scale-95 transition-all">
                        <MessageCircle size={12} /> Wish
                      </button>
                    )}
                  </div>
                ))}
                {(birthdayTab === 'TODAY' ? birthdayData.bToday : birthdayData.bTomorrow).length === 0 && (
                  <div className="text-center py-6 text-[9px] font-black text-slate-300 uppercase tracking-widest">No birthdays {birthdayTab.toLowerCase()}</div>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`bg-${alertCenterTab === 'RENEWAL' ? 'amber' : 'red'}-50 p-2 rounded-xl text-${alertCenterTab === 'RENEWAL' ? 'amber' : 'red'}-500`}><Bell size={18} /></div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-tight text-slate-800">Alert Center</h3>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Actions Required</p>
                  </div>
                </div>
                <div className="flex bg-slate-50 p-1 rounded-xl">
                  {['RENEWAL', 'PENDING'].map(tab => (
                    <button key={tab} onClick={() => setAlertCenterTab(tab as any)} className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${alertCenterTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>
                      {tab}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="space-y-3 max-h-[350px] overflow-y-auto custom-scrollbar pr-1">
                {alertCenterTab === 'RENEWAL' ? (
                  <>
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                      <div className="min-w-[140px] bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
                        <span className="text-[8px] font-black text-amber-600 uppercase block mb-1">Within 7 Days</span>
                        <span className="text-xl font-black text-slate-900">{homeReminders.m7.length}</span>
                      </div>
                      <div className="min-w-[140px] bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Next 15 Days</span>
                        <span className="text-xl font-black text-slate-900">{homeReminders.m15.length}</span>
                      </div>
                    </div>
                    {[...homeReminders.m7, ...homeReminders.m15].map(member => (
                      <div key={member.id} className="flex items-center justify-between p-3.5 bg-white border border-slate-100 rounded-2xl">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-[11px] ${getRemainingDays(member.expiryDate) <= 7 ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                            {getRemainingDays(member.expiryDate)}d
                          </div>
                          <div>
                            <h4 className="text-[10px] font-black uppercase text-slate-800">{member.fullName}</h4>
                            <p className="text-[8px] font-bold text-slate-400 uppercase">Reminders: {member.reminderCount}</p>
                          </div>
                        </div>
                        <button onClick={() => sendWhatsAppReminder(member, 'expiry')} className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl"><MessageCircle size={14} /></button>
                      </div>
                    ))}
                    {[...homeReminders.m7, ...homeReminders.m15].length === 0 && (
                      <div className="text-center py-6 text-[9px] font-black text-slate-300 uppercase tracking-widest">No upcoming expiries</div>
                    )}
                  </>
                ) : (
                  <>
                    {homeReminders.pending.map(member => (
                      <div key={member.id} className="flex items-center justify-between p-4 bg-red-50/30 border border-red-100 rounded-2xl">
                        <div className="flex items-center gap-4">
                          <div className="bg-white w-10 h-10 rounded-xl flex items-center justify-center font-black text-slate-800 border border-red-100">
                            {member.fullName.charAt(0)}
                          </div>
                          <div>
                            <h4 className="text-[10px] font-black uppercase text-slate-800">{member.fullName}</h4>
                            <p className="text-[8px] font-black text-red-600 uppercase">Balance: ₹{member.totalFee - member.totalPaid}</p>
                            <p className="text-[7px] font-bold text-slate-400 uppercase">Reminders: {member.reminderCount}</p>
                          </div>
                        </div>
                        <button onClick={() => sendWhatsAppReminder(member, 'pending')} className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl text-[9px] font-black uppercase shadow-lg shadow-emerald-500/20">
                          <MessageCircle size={12} /> Notify
                        </button>
                      </div>
                    ))}
                    {homeReminders.pending.length === 0 && (
                      <div className="text-center py-6 text-[9px] font-black text-slate-300 uppercase tracking-widest">All fees clear</div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-slate-50 p-2 rounded-xl text-slate-400"><BarChart3 size={18} /></div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-tight text-slate-800">Revenue Comparison</h3>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Last 6 Months Collection</p>
                  </div>
                </div>
              </div>
              <div className="overflow-hidden border border-slate-100 rounded-2xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Month-Year</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revenueStats.monthlyData.map((data, idx) => (
                      <tr key={idx} className={`border-b border-slate-50 last:border-0 ${idx === revenueStats.monthlyData.length - 1 ? 'bg-emerald-50/50' : ''}`}>
                        <td className="px-4 py-3 text-[11px] font-black text-slate-700">{data.month}</td>
                        <td className="px-4 py-3 text-[11px] font-black text-slate-900 text-right">₹{data.revenue.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'MEMBERS' && (
          <div className="space-y-6">
            <div className="sticky top-16 bg-slate-50/95 backdrop-blur-sm z-30 pt-4 pb-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="text" placeholder="Search members..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-bold shadow-sm focus:outline-none" />
                </div>
                <button onClick={() => setShowEnrollModal(true)} className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg"><Plus size={24} /></button>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {(['ALL', 'ACTIVE', 'INACTIVE', '7DAYS', '15DAYS'] as MemberTab[]).map(tab => (
                  <button key={tab} onClick={() => setMemberTab(tab)} className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all shrink-0 ${memberTab === tab ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 border-slate-100'}`}>{tab}</button>
                ))}
              </div>
            </div>
            <div className="space-y-3 pb-20">
              {filteredMembers.map(member => {
                const pending = member.totalFee - member.totalPaid;
                return (
                  <div key={member.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center font-black text-slate-600 uppercase text-lg border border-slate-100">{member.fullName.charAt(0)}</div>
                    <div className="flex-1">
                      <h4 className="font-black text-xs uppercase text-slate-800">{member.fullName}</h4>
                      <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">
                        {member.phoneNumber} • {getRemainingDays(member.expiry_date)}d left
                        {pending > 0 && (
                          <span className="text-red-500 ml-2 font-black italic">Pending: ₹{pending}</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={(e) => { e.stopPropagation(); setEditingMember(member); setFormData({ ...member, phoneNumber: member.phoneNumber.replace('+91',''), paymentReceived: member.totalPaid }); setShowEnrollModal(true); }} className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100"><Edit2 size={14} /></button>
                      {!member.welcomeSent && (
                        <button onClick={() => sendWhatsAppReminder(member, 'welcome')} className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl"><Send size={14} /></button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'LOGS' && (
          <div className="space-y-6 pb-20">
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
               <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-slate-400" />
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Timeline</h3>
                </div>
                <button onClick={fetchData} className="text-[8px] font-black text-emerald-500 uppercase px-3 py-1.5 bg-emerald-50 rounded-lg">Refresh</button>
              </div>
              <div className="space-y-6">
                {logsByDay.today.map(log => (
                  <div key={log.id} className="relative pl-6 pb-4 border-l border-slate-100 last:pb-0">
                    <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-slate-400"></div>
                    <div className="flex justify-between items-start">
                      <p className="text-[10px] font-black uppercase text-slate-800">{log.action}</p>
                      <p className="text-[8px] text-slate-300 font-black uppercase">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <p className="text-[11px] text-slate-600 font-medium leading-tight mt-0.5">{log.details}</p>
                    
                    {(log.oldValue || log.newValue) && (
                      <div className="mt-2 bg-slate-50/80 border border-slate-100 rounded-xl p-3 space-y-2">
                        {log.oldValue && (
                          <div className="flex gap-2">
                            <span className="text-[8px] font-black text-red-400 uppercase shrink-0">Was:</span>
                            <span className="text-[9px] font-bold text-slate-400 italic leading-tight">{log.oldValue}</span>
                          </div>
                        )}
                        {log.newValue && (
                          <div className="flex gap-2 border-t border-slate-200/50 pt-1">
                            <span className="text-[8px] font-black text-emerald-500 uppercase shrink-0">Now:</span>
                            <span className="text-[9px] font-black text-slate-700 leading-tight">{log.newValue}</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <p className="text-[8px] text-slate-300 font-black uppercase mt-1.5">By: <span className="text-slate-500 font-bold">{log.userName}</span></p>
                  </div>
                ))}
                {logsByDay.today.length === 0 && (
                  <div className="text-center py-10 opacity-30">
                    <p className="text-[10px] font-black uppercase tracking-widest">No activity today</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'DEVICES' && (
          <div className="space-y-6">
            <div className="bg-slate-900 rounded-[32px] p-6 shadow-xl border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                  <Smartphone size={24} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-tight leading-none">Connected Devices</h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Active Management Sessions</p>
                </div>
              </div>
              <div className="text-3xl font-black text-white px-4 border-l border-white/10">
                {sessions.length}
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <ShieldCheck size={18} className="text-emerald-500" />
                <h3 className="text-xs font-black uppercase text-slate-800">Active Sessions</h3>
              </div>
              <div className="space-y-4">
                {sessions.map((session, index) => {
                  const isCurrent = session.id === currentUser?.sessionId;
                  return (
                    <div key={session.id} className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${isCurrent ? 'bg-emerald-50 border-emerald-100 ring-2 ring-emerald-500/10' : 'bg-slate-50 border-slate-100'}`}>
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center font-black text-[10px] text-slate-400">
                          #{index + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-[10px] font-black uppercase text-slate-800">{session.user_name}</h4>
                            {isCurrent && <span className="text-[7px] font-black bg-emerald-500 text-white px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-sm">Current Device</span>}
                          </div>
                          <p className="text-[8px] font-bold text-slate-400 uppercase">{session.device_type} • {session.ip_address}</p>
                          <p className="text-[7px] text-slate-300 mt-1 uppercase font-bold">UID: {session.device_id.slice(-8)}</p>
                        </div>
                      </div>
                      {isMasterAdmin && !isCurrent && (
                        <button onClick={() => removeSession(session.id, session.user_name)} className="p-2.5 bg-red-50 text-red-500 border border-red-100 rounded-xl active:scale-90 transition-all shadow-sm"><Power size={14} /></button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className={`fixed inset-0 z-[100] transition-all duration-500 ${showEnrollModal ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={closeEnrollmentFlow}></div>
          <div className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-[40px] shadow-2xl transition-transform duration-500 transform ${showEnrollModal ? 'translate-y-0' : 'translate-y-full'} overflow-y-auto max-h-[90vh] pb-10 p-8`}>
            {!enrollmentSuccess ? (
              <div className="space-y-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-black uppercase tracking-tight">{editingMember ? 'Update Member' : 'Enrollment'}</h2>
                  <button onClick={closeEnrollmentFlow} className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400"><X size={20} /></button>
                </div>
                
                <FormSection title="Personal Info">
                  <div className="space-y-4">
                    <div className="relative">
                      <UserIcon size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" />
                      <input type="text" placeholder="Full Name (Mandatory)" value={formData.fullName} onChange={e => {
                        if (validateName(e.target.value)) setFormData(p => ({...p, fullName: e.target.value}));
                      }} className={`w-full bg-slate-50 border ${enrollNameError ? 'border-red-300' : 'border-slate-100'} rounded-2xl pl-14 pr-5 py-4 font-bold outline-none`} />
                    </div>
                    {enrollNameError && <p className="text-red-500 text-[8px] font-black px-2 uppercase">{enrollNameError}</p>}
                    
                    <div className="relative">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-500 font-black text-xs">+91</span>
                      <input type="tel" maxLength={10} value={formData.phoneNumber} onChange={e => {
                        if (validatePhone(e.target.value)) setFormData(p => ({...p, phoneNumber: e.target.value}));
                      }} className={`w-full bg-slate-50 border ${enrollPhoneError ? 'border-red-300' : 'border-slate-100'} rounded-2xl pl-14 pr-5 py-4 font-bold outline-none`} placeholder="WhatsApp Number (Mandatory)" />
                    </div>
                    {enrollPhoneError && <p className="text-red-500 text-[8px] font-black px-2 uppercase">{enrollPhoneError}</p>}

                    <div className="relative">
                      <Mail size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" />
                      <input type="email" placeholder="Email (Optional)" value={formData.email} onChange={e => setFormData(p => ({...p, email: e.target.value}))} className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-14 pr-5 py-4 font-bold outline-none" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[9px] font-black uppercase text-slate-400 mb-1.5 block">Birthdate</label>
                        <div className="relative">
                          <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                          <input type="date" max={todayStr} value={formData.birthdate} onChange={e => setFormData(p => ({...p, birthdate: e.target.value}))} className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-11 pr-3 py-4 font-bold text-xs" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase text-slate-400 mb-1.5 block">Gender</label>
                        <div className="flex gap-2">
                          {(['MALE', 'FEMALE'] as Gender[]).map(g => (
                            <button key={g} type="button" onClick={() => setFormData(p => ({...p, gender: g}))} className={`flex-1 py-3.5 rounded-xl text-[9px] font-black uppercase border ${formData.gender === g ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-100 text-slate-400'}`}>
                              {g.charAt(0)}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </FormSection>

                <FormSection title="Plan Details">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      {(['SINGLE', 'COUPLE'] as MembershipType[]).map(type => (
                        <button key={type} type="button" onClick={() => setFormData(p => ({...p, membershipType: type}))} className={`py-3 rounded-xl text-[10px] font-black uppercase border ${formData.membershipType === type ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-100'}`}>
                          {type === 'COUPLE' ? 'Couple/2 Person' : 'Single'}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {(['GYM', 'MMA'] as ServiceCategory[]).map(cat => (
                        <button key={cat} type="button" onClick={() => setFormData(p => ({...p, serviceCategory: cat}))} className={`py-3 rounded-xl text-[10px] font-black uppercase border ${formData.serviceCategory === cat ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-100'}`}>
                          {cat}
                        </button>
                      ))}
                    </div>

                    <select value={formData.packageId} onChange={e => setFormData(p => ({...p, packageId: e.target.value}))} className="w-full bg-white border border-slate-100 rounded-2xl px-5 py-4 text-xs font-black outline-none">
                      {filteredPackagesForForm.map(pkg => (
                        <option key={pkg.id} value={pkg.id}>{pkg.name} - ₹{pkg.price}</option>
                      ))}
                    </select>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[9px] font-black uppercase text-slate-400 mb-1.5 block">Joining Date</label>
                        <div className="relative">
                          <CalendarDays size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                          <input type="date" max={todayStr} value={formData.joiningDate} onChange={e => setFormData(p => ({...p, joiningDate: e.target.value}))} className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-11 pr-3 py-4 font-bold text-xs" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase text-slate-400 mb-1.5 block">Renewal Date</label>
                        <input type="date" readOnly value={calculatedExpiryDate} className="w-full bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-4 font-bold text-xs text-emerald-700" />
                      </div>
                    </div>

                    <div className="space-y-4 bg-slate-50 p-4 rounded-3xl border border-slate-100">
                      <div>
                        <label className="text-[9px] font-black uppercase text-slate-400 mb-1.5 block">Paid Amount (₹)</label>
                        <input 
                          type="number" 
                          min="0"
                          step="any"
                          onKeyDown={(e) => {
                            // Strictly block characters that lead to scientific notation or negative values
                            if (['e', 'E', '-', '+'].includes(e.key)) {
                              e.preventDefault();
                            }
                          }}
                          value={formData.paymentReceived || ''} 
                          onChange={e => {
                            const val = e.target.value;
                            if (val === '') {
                              setFormData(p => ({...p, paymentReceived: 0}));
                            } else {
                              const n = parseFloat(val);
                              if (!isNaN(n)) {
                                setFormData(p => ({...p, paymentReceived: Math.max(0, n)}));
                              }
                            }
                          }} 
                          className="w-full bg-white border border-slate-100 rounded-2xl px-5 py-4 font-black outline-none" 
                          placeholder="Amount Paid" 
                        />
                      </div>
                      <div className="flex items-center justify-between px-2 pt-2 border-t">
                        <span className="text-[9px] font-black uppercase text-slate-400">Total: ₹{selectedPackageData.price}</span>
                        <span className={`text-sm font-black ${pendingAmount > 0 ? 'text-red-500' : 'text-emerald-500'}`}>Pending: ₹{pendingAmount}</span>
                      </div>
                    </div>
                  </div>
                </FormSection>

                <button onClick={handleEnrollment} disabled={isSyncing} className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-transform disabled:opacity-50">
                  {isSyncing ? <RefreshCw className="animate-spin" size={20} /> : <ShieldCheck size={20} />}
                  {isSyncing ? 'SYNCING...' : editingMember ? 'UPDATE' : 'ENROLL'}
                </button>
              </div>
            ) : (
              <div className="text-center py-10 space-y-6">
                <div className="bg-emerald-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto text-emerald-500"><ShieldCheck size={48} /></div>
                <div>
                  <h3 className="text-2xl font-black uppercase">Success</h3>
                  <p className="text-slate-400 text-[10px] font-bold uppercase">Record Updated Successfully</p>
                </div>
                <button onClick={closeEnrollmentFlow} className="w-full bg-emerald-500 text-white py-5 rounded-3xl font-black active:scale-95">OK</button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 mb-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-full inline-block shadow-sm border border-emerald-100">
            {'created by '}
            <span className="font-black">Vishwajeet Bhangare (9595107293)</span>
          </p>
        </div>
      </main>
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default App;

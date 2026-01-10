import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header.tsx';
import BottomNav from './components/BottomNav.tsx';
import FormSection from './components/FormSection.tsx';
import { MembershipType, RegistrationData, NavTab, ServiceCategory, Member, MemberTab, User, LogEntry, Gender } from './types.ts';
import { PACKAGES } from './constants.ts';
import { supabase, PROJECT_ID, SUPABASE_ANON_KEY } from './lib/supabase.ts';
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
  AlertTriangle,
  User as UserIcon,
  Database,
  UserCheck,
  IndianRupee,
  Calendar,
  CalendarDays,
  AlertCircle,
  Bell,
  AlertOctagon,
  CheckCircle2,
  Send,
  Cake,
  Gift
} from 'lucide-react';

const MASTER_KEY = '240596';

const MANAGER_MAP: Record<string, string> = {
  '9130368298': 'Shrikanth Sir',
  '9595107293': 'Vishwajeet Sir',
  '9823733536': 'Radha Mam'
};

const ALLOWED_MANAGEMENT_PHONES = Object.keys(MANAGER_MAP);

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
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [enrollmentSuccess, setEnrollmentSuccess] = useState<Member | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [schemaError, setSchemaError] = useState<boolean>(false);

  const [members, setMembers] = useState<Member[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const [loginPhone, setLoginPhone] = useState('');
  const [loginError, setLoginError] = useState('');
  const [enrollPhoneError, setEnrollPhoneError] = useState('');
  const [enrollNameError, setEnrollNameError] = useState('');

  const birthdateInputRef = useRef<HTMLInputElement>(null);
  const joiningDateInputRef = useRef<HTMLInputElement>(null);

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

  const getRemainingDays = (expiryDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getDaysSinceJoining = (joiningDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const join = new Date(joiningDate);
    join.setHours(0, 0, 0, 0);
    const diff = Math.floor((today.getTime() - join.getTime()) / (1000 * 60 * 60 * 24));
    return diff < 0 ? 0 : diff;
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

  const isConfigMissing = SUPABASE_ANON_KEY.includes('YOUR_ACTUAL_LONG');

  const safeShowPicker = (input: HTMLInputElement | null) => {
    if (input && typeof (input as any).showPicker === 'function') {
      try {
        (input as any).showPicker();
      } catch (err) {
        console.warn("Native picker failed, focusing input instead", err);
        input.focus();
      }
    } else if (input) {
      input.focus();
      input.click();
    }
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
      // Fix: Map the correct camelCase properties from params to snake_case for Supabase
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
      if (error) {
        if (error.message.includes('column') || error.message.includes('schema cache')) {
          setSchemaError(true);
        }
        console.error("Log error:", error.message);
      }
    } catch (err) {
      console.error("Critical logging error:", err);
    }
  };

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
        if (mError.message.includes('column') || mError.message.includes('schema cache')) {
          setSchemaError(true);
        }
        throw mError;
      }

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
    } catch (err: any) {
      const errMsg = err.message || JSON.stringify(err);
      if (errMsg.includes('column') || errMsg.includes('schema cache')) {
        setSchemaError(true);
      }
      setConnectionError(err.message === 'Unauthorized' ? 'Invalid API Key' : errMsg || 'Connection Error');
    } finally {
      setIsSyncing(false);
    }
  }, [currentUser, isConfigMissing]);

  useEffect(() => {
    if (!currentUser || isConfigMissing) return;
    fetchData();
    const channel = supabase.channel('global-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, () => fetchData())
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
    const form = e.currentTarget as HTMLFormElement;
    const key = (new FormData(form)).get('masterKey') as string;
    
    if (key === MASTER_KEY && ALLOWED_MANAGEMENT_PHONES.includes(phoneClean)) {
      const derivedName = MANAGER_MAP[phoneClean];
      const user = { phoneNumber: `+91${phoneClean}`, name: derivedName, loginTime: new Date().toISOString() };
      setCurrentUser(user);
      localStorage.setItem('thecage_session', JSON.stringify(user));
      await addLog({
        action: 'LOGIN',
        details: `${user.name} logged in from device`,
        userOverride: user
      });
    } else {
      setLoginError('INVALID CREDENTIALS');
    }
  };

  const handleLogout = async () => {
    if (currentUser) await addLog({
      action: 'LOGOUT',
      details: `${currentUser.name} logged out`
    });
    setCurrentUser(null);
    localStorage.removeItem('thecage_session');
  };

  const handleEnrollment = async () => {
    setEnrollNameError('');
    setEnrollPhoneError('');

    if (!formData.fullName.trim()) {
      setEnrollNameError('NAME IS REQUIRED');
      return;
    }

    if (enrollNameError) return;

    const paidVal = Number(formData.paymentReceived) || 0;
    if (paidVal < 0) {
      alert("Payment amount cannot be negative");
      return;
    }

    const phoneDigits = formData.phoneNumber.replace(/\D/g, '');
    if (phoneDigits.length !== 10) {
      setEnrollPhoneError('Enter valid number (10 digits)');
      return;
    }

    if (enrollPhoneError) return;

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
        const changes = [];
        if (editingMember.fullName !== memberData.full_name) changes.push(`Name: ${editingMember.fullName} -> ${memberData.full_name}`);
        if (editingMember.totalPaid !== memberData.total_paid) changes.push(`Paid: ₹${editingMember.totalPaid} -> ₹${memberData.total_paid}`);
        if (editingMember.packageId !== memberData.package_id) changes.push(`Package: ${editingMember.packageId} -> ${memberData.package_id}`);
        if (editingMember.gender !== memberData.gender) changes.push(`Gender: ${editingMember.gender} -> ${memberData.gender}`);
        
        await addLog({
          action: 'MEMBER_UPDATE',
          details: `${currentUser?.name} updated ${memberData.full_name}`,
          memberId: memberData.id,
          memberName: memberData.full_name,
          oldValue: changes.length > 0 ? changes.join(', ') : 'No data changes',
          newValue: 'Updated record committed'
        });
      } else {
        await addLog({
          action: 'MEMBER_ENROLL',
          details: `${currentUser?.name} enrolled ${memberData.full_name}`,
          memberId: memberData.id,
          memberName: memberData.full_name,
          newValue: `Service: ${memberData.service_category}, Gender: ${memberData.gender}, Paid: ₹${memberData.total_paid}`
        });
      }

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
          birthdate: memberData.birthdate,
          gender: memberData.gender as Gender,
          totalPaid: memberData.total_paid,
          totalFee: memberData.total_fee,
          welcomeSent: false,
          reminderCount: 0
        });
      } else {
        closeEnrollmentFlow();
      }
    } catch (err: any) {
      const errMsg = err.message || JSON.stringify(err);
      if (errMsg.includes('column') || errMsg.includes('schema cache')) setSchemaError(true);
      alert('Sync Error: ' + errMsg);
    } finally {
      setIsSyncing(false);
    }
  };

  const closeEnrollmentFlow = () => {
    setShowEnrollModal(false);
    setEnrollmentSuccess(null);
    setEditingMember(null);
    setEnrollPhoneError('');
    setEnrollNameError('');
    setFormData({ 
      fullName: '', 
      phoneNumber: '', 
      email: '', 
      membershipType: MembershipType.SINGLE, 
      serviceCategory: ServiceCategory.GYM, 
      packageId: PACKAGES[0].id, 
      joiningDate: todayStr, 
      birthdate: '2000-01-01',
      gender: Gender.MALE,
      paymentReceived: 0 
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
        month: monthNames[m],
        revenue: monthlyRevenue
      });
    }

    const currentMonthRevenue = monthlyData[monthlyData.length - 1]?.revenue || 0;
    const maxRevenue = Math.max(...monthlyData.map(d => d.revenue), 1000); 

    return { monthlyData, currentMonthRevenue, maxRevenue };
  }, [members]);

  const logsByDay = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    return {
      today: logs.filter(l => new Date(l.timestamp) >= today),
      earlier: logs.filter(l => new Date(l.timestamp) < today)
    };
  }, [logs]);

  const updateMemberMessageStatus = async (memberId: string, updates: { welcome_sent?: boolean; reminder_count?: number }) => {
    if (schemaError) {
      console.warn("Skipping message update due to schema detection issue.");
      return;
    }
    
    try {
      const { error } = await supabase.from('members').update(updates).eq('id', memberId);
      if (error) {
        const errMsg = error.message || JSON.stringify(error);
        if (errMsg.includes('column') || errMsg.includes('schema cache')) {
          setSchemaError(true);
        }
        throw new Error(errMsg);
      }
      
      setMembers(prev => prev.map(m => m.id === memberId ? { 
        ...m, 
        welcomeSent: updates.welcome_sent !== undefined ? updates.welcome_sent : m.welcomeSent,
        reminderCount: updates.reminder_count !== undefined ? updates.reminder_count : m.reminderCount
      } : m));
    } catch (err: any) {
      console.error("Failed to update message status:", err.message || err);
    }
  };

  const formatDateString = (dateString: string) => {
    if (!dateString) return 'Invalid Date';
    return new Date(dateString).toLocaleDateString('en-GB'); // dd/mm/yyyy
  };

  const sendBirthdayWish = (member: Member) => {
    const phone = member.phoneNumber.replace(/\D/g, '');
    const text = `*Warmest Birthday Greetings!* 🎂

Dear ${member.fullName},

Warmest birthday greetings from all of us at *The Cage MMA-Gym & RS Fitness Academy!*

May your day be as incredible as your dedication to fitness. Wishing you a year ahead filled with strength, health, success, and prosperity. We are proud to have you as a valued member of our fitness community. 🦾

Best Regards,
The Management Team
The Cage MMA-Gym & RS Fitness Academy`;

    addLog({
      action: 'BIRTHDAY_WISH',
      details: `Birthday wish sent to ${member.fullName}`,
      memberId: member.id,
      memberName: member.fullName
    });

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const sendWhatsAppReminder = (member: Member, type: 'expiry' | 'pending' | 'welcome') => {
    const phone = member.phoneNumber.replace(/\D/g, '');
    let text = '';
    
    if (type === 'welcome') {
      if (member.welcomeSent) {
        alert("Welcome message already sent to this member.");
        return;
      }
      
      const pkg = PACKAGES.find(p => p.id === member.packageId) || { name: 'Custom Package' };
      const managerName = currentUser?.name || 'Manager';
      const managerPhone = currentUser?.phoneNumber || 'Management';
      const pendingFees = member.totalFee - member.totalPaid;

      text = `*Hello ${member.fullName}!*

Greetings from The Cage MMA-Gym & RS Fitness Academy. I am ${managerName}, sending this message on behalf of our management team. We are extremely excited to have you join our fitness community! 🦾

Your Membership Details:
• Name: ${member.fullName}
• Plan: ${member.serviceCategory} (${pkg.name})
• Joining Date: ${formatDateString(member.joiningDate)}
• Expiry Date: ${formatDateString(member.expiryDate)}

Payment Information:
• Fees Paid: ₹${member.totalPaid}
• Pending Fees: ₹${pendingFees}

Enrolled by: ${managerName} (${managerPhone})

Let's work together to achieve your fitness goals! 🚀

Best Regards,
The Cage MMA-Gym & RS Fitness Academy`;

      updateMemberMessageStatus(member.id, { welcome_sent: true });
      addLog({
        action: 'WELCOME_SENT',
        details: `Welcome message from ${managerName} sent to ${member.fullName}`,
        memberId: member.id,
        memberName: member.fullName
      });
    } else if (type === 'expiry') {
      const days = getRemainingDays(member.expiryDate);
      text = `Hello ${member.fullName}, this is a reminder from The Cage MMA-Gym & RS Fitness Academy. Your membership is expiring in ${days} days (on ${formatDateString(member.expiryDate)}). Please visit the counter for renewal. Thank you!`;
      updateMemberMessageStatus(member.id, { reminder_count: member.reminderCount + 1 });
      addLog({
        action: 'EXPIRY_REMINDER',
        details: `Expiry reminder #${member.reminderCount + 1} sent to ${member.fullName}`,
        memberId: member.id,
        memberName: member.fullName
      });
    } else {
      const pending = member.totalFee - member.totalPaid;
      text = `Hello ${member.fullName}, this is a reminder from The Cage MMA-Gym & RS Fitness Academy regarding your pending membership fee of ₹${pending}. Please clear the balance at your earliest convenience. Thank you!`;
      updateMemberMessageStatus(member.id, { reminder_count: member.reminderCount + 1 });
      addLog({
        action: 'PENDING_REMINDER',
        details: `Fee reminder #${member.reminderCount + 1} sent to ${member.fullName}`,
        memberId: member.id,
        memberName: member.fullName
      });
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
        <p className="text-sm text-slate-500 font-medium leading-relaxed">
          The app is currently in <span className="text-red-500 font-bold underline">Offline Mode</span> because the Supabase API key is missing.
        </p>
        <div className="bg-slate-50 p-4 rounded-2xl text-left space-y-2">
          <p className="text-[10px] font-black uppercase text-slate-400">Next Steps:</p>
          <ul className="text-[11px] text-slate-600 font-bold list-disc pl-4 space-y-1">
            <li>Go to Supabase Dashboard > Settings > API</li>
            <li>Copy the "anon" (public) key</li>
            <li>Paste it into <code className="bg-white px-1">lib/supabase.ts</code></li>
          </ul>
        </div>
      </div>
    </div>
  );

  if (!currentUser) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-sm bg-white p-10 rounded-[40px] shadow-2xl">
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
          <button className="w-full bg-emerald-500 text-white py-5 rounded-3xl font-black active:scale-[0.98] transition-all shadow-lg shadow-emerald-500/20 mt-4">LOG IN & SYNC</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-28 text-black">
      <Header user={currentUser} onLogout={handleLogout} />
      
      {schemaError && (
        <div className="bg-red-600 text-white px-6 py-4 flex flex-col items-center gap-3 text-center animate-in slide-in-from-top duration-500 relative z-[60]">
          <div className="flex items-center gap-2">
            <AlertTriangle size={24} className="animate-pulse" />
            <h4 className="font-black uppercase text-xs">Schema Refresh Required</h4>
          </div>
          <p className="text-[10px] font-bold opacity-90 leading-relaxed uppercase max-w-sm">
            PostgREST Cache is stale. If you ran the SQL, try the "Reload Schema" command in Supabase SQL editor again. Tracking features are currently disabled.
          </p>
          <button onClick={fetchData} className="bg-white text-red-600 px-4 py-2 rounded-xl font-black text-[9px] uppercase shadow-lg active:scale-95 transition-all">Retry Cache Sync</button>
        </div>
      )}

      <div className="px-4 py-2 flex items-center justify-between transition-colors duration-500 bg-slate-900 border-b border-white/5">
        <div className="flex items-center gap-2">
           <div className={`w-2.5 h-2.5 rounded-full transition-colors duration-500 ${isSyncing ? 'bg-emerald-400 animate-pulse' : connectionError ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
        </div>
      </div>

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
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-emerald-50 text-emerald-500 rounded-lg"><UserIcon size={14} /></div>
                  <span className="text-slate-400 font-bold text-[9px] uppercase tracking-widest">Active Members</span>
                </div>
                <span className="text-2xl font-black text-black">{members.filter(m => getRemainingDays(m.expiryDate) >= 0).length}</span>
              </div>
              <div className="bg-slate-900 p-6 rounded-3xl shadow-lg border border-slate-800">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg"><IndianRupee size={14} /></div>
                  <span className="text-slate-400 font-bold text-[9px] uppercase tracking-widest">Month Revenue</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-white">₹{revenueStats.currentMonthRevenue.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Member Birthdays Section */}
            <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-pink-50 p-2 rounded-xl text-pink-500">
                    <Gift size={18} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-tight text-slate-800">Member Birthdays</h3>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Celebrate Our Family</p>
                  </div>
                </div>
                <div className="flex bg-slate-50 p-1 rounded-xl">
                  <button 
                    onClick={() => setBirthdayTab('TODAY')}
                    className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${birthdayTab === 'TODAY' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
                  >
                    Today
                  </button>
                  <button 
                    onClick={() => setBirthdayTab('TOMORROW')}
                    className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${birthdayTab === 'TOMORROW' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
                  >
                    Tomorrow
                  </button>
                </div>
              </div>

              <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                {(birthdayTab === 'TODAY' ? birthdayData.bToday : birthdayData.bTomorrow).map(member => (
                  <div key={member.id} className="flex items-center justify-between p-3.5 bg-slate-50/50 border border-slate-100 rounded-2xl group hover:border-pink-200 transition-all">
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
                      <button 
                        onClick={() => sendBirthdayWish(member)}
                        className="flex items-center gap-2 px-4 py-2 bg-pink-500 text-white rounded-xl text-[9px] font-black uppercase shadow-lg shadow-pink-500/20 active:scale-95 transition-all"
                      >
                        <MessageCircle size={12} />
                        Wish
                      </button>
                    )}
                    {birthdayTab === 'TOMORROW' && (
                       <div className="text-[7px] font-black text-slate-300 uppercase bg-white border border-slate-100 px-2 py-1 rounded-lg">Tomorrow</div>
                    )}
                  </div>
                ))}
                {(birthdayTab === 'TODAY' ? birthdayData.bToday : birthdayData.bTomorrow).length === 0 && (
                  <div className="text-center py-8">
                    <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-2 text-slate-300">
                      <Cake size={18} />
                    </div>
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">No birthdays {birthdayTab.toLowerCase()}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
              <div className="flex items-center gap-2">
                <div className="bg-amber-50 p-2 rounded-xl text-amber-500">
                  <Bell size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-tight text-slate-800">Renewal Alerts</h3>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Upcoming Expiries (15 Days)</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                  <div className="min-w-[140px] bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
                    <span className="text-[8px] font-black text-amber-600 uppercase block mb-1">Within 7 Days</span>
                    <span className="text-xl font-black text-slate-900">{homeReminders.m7.length} Members</span>
                  </div>
                  <div className="min-w-[140px] bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Next 15 Days</span>
                    <span className="text-xl font-black text-slate-900">{homeReminders.m15.length} Members</span>
                  </div>
                </div>

                <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {[...homeReminders.m7, ...homeReminders.m15].map(member => {
                    const days = getRemainingDays(member.expiryDate);
                    return (
                      <div key={member.id} className="flex items-center justify-between p-3.5 bg-white border border-slate-100 rounded-2xl hover:border-slate-300 transition-all">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-[11px] shadow-sm ${days <= 7 ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                            {days}d
                          </div>
                          <div>
                            <h4 className="text-[10px] font-black uppercase text-slate-800">{member.fullName}</h4>
                            <div className="flex items-center gap-2">
                              <p className="text-[8px] font-bold text-slate-400 uppercase">{member.phoneNumber}</p>
                              {!schemaError && member.reminderCount > 0 && (
                                <span className="text-[7px] font-black text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded-full uppercase">Reminders: {member.reminderCount}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={() => sendWhatsAppReminder(member, 'expiry')}
                          className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 active:scale-90 transition-all"
                        >
                          <MessageCircle size={14} />
                        </button>
                      </div>
                    );
                  })}
                  {homeReminders.m7.length === 0 && homeReminders.m15.length === 0 && (
                    <div className="text-center py-8">
                      <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-2 text-slate-300">
                        <Calendar size={18} />
                      </div>
                      <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">No renewals due soon</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
              <div className="flex items-center gap-2">
                <div className="bg-red-50 p-2 rounded-xl text-red-500">
                  <AlertOctagon size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-tight text-slate-800">Fees Pending</h3>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Unpaid Balances Found</p>
                </div>
              </div>

              <div className="space-y-3">
                {homeReminders.pending.map(member => {
                  const pending = member.totalFee - member.totalPaid;
                  const daysSince = getDaysSinceJoining(member.joiningDate);
                  return (
                    <div key={member.id} className="flex items-center justify-between p-4 bg-red-50/30 border border-red-100 rounded-2xl">
                      <div className="flex items-center gap-4">
                        <div className="bg-white w-10 h-10 rounded-xl flex items-center justify-center font-black text-slate-800 border border-red-100 shadow-sm">
                          {member.fullName.charAt(0)}
                        </div>
                        <div>
                          <h4 className="text-[10px] font-black uppercase text-slate-800">{member.fullName}</h4>
                          <div className="flex flex-col gap-0.5 mt-0.5">
                            <p className="text-[8px] font-black text-red-600 uppercase">Balance: ₹{pending}</p>
                            <div className="flex items-center gap-2">
                              <p className="text-[7px] font-bold text-slate-500 uppercase">Pending for {daysSince} days</p>
                              {!schemaError && member.reminderCount > 0 && (
                                <span className="text-[6px] font-black text-red-400 bg-white border border-red-100 px-1 rounded-full uppercase">Sent {member.reminderCount}x</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => sendWhatsAppReminder(member, 'pending')}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl text-[9px] font-black uppercase shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                      >
                        <MessageCircle size={12} />
                        Notify
                      </button>
                    </div>
                  );
                })}
                {homeReminders.pending.length === 0 && (
                  <div className="text-center py-6">
                    <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-2 text-emerald-300">
                      <ShieldCheck size={18} />
                    </div>
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">All accounts are clear</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-slate-50 p-2 rounded-xl text-slate-400">
                    <BarChart3 size={18} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-tight text-slate-800">Revenue Trends</h3>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Last 6 Months</p>
                  </div>
                </div>
              </div>

              <div className="flex items-end justify-between gap-2 h-40 pt-4 px-2">
                {revenueStats.monthlyData.map((data, idx) => {
                  const barHeight = (data.revenue / revenueStats.maxRevenue) * 100;
                  const isCurrent = idx === revenueStats.monthlyData.length - 1;
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-3 group">
                      <div className="relative w-full flex flex-col items-center">
                        <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[8px] font-black px-2 py-1 rounded-md z-10 whitespace-nowrap">
                          ₹{data.revenue.toLocaleString()}
                        </div>
                        <div 
                          style={{ height: `${Math.max(barHeight, 4)}%` }} 
                          className={`w-full max-w-[32px] rounded-t-xl transition-all duration-500 ${isCurrent ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30' : 'bg-slate-100 group-hover:bg-slate-200'}`}
                        ></div>
                      </div>
                      <span className={`text-[9px] font-black uppercase tracking-wider ${isCurrent ? 'text-emerald-500' : 'text-slate-400'}`}>
                        {data.month}
                      </span>
                    </div>
                  );
                })}
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
                <button 
                  onClick={() => setShowEnrollModal(true)}
                  className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-all"
                >
                  <Plus size={24} />
                </button>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {(['ALL', 'ACTIVE', 'INACTIVE', '7DAYS', '15DAYS'] as MemberTab[]).map(tab => (
                  <button key={tab} onClick={() => setMemberTab(tab)} className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all shrink-0 ${memberTab === tab ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 border-slate-100'}`}>
                    {tab === '7DAYS' ? '7 Days' : tab === '15DAYS' ? '15 Days' : tab}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-3 pb-20">
              {filteredMembers.map(member => {
                const daysLeft = getRemainingDays(member.expiryDate);
                const pending = member.totalFee - member.totalPaid;
                const statusColor = daysLeft < 0 ? 'bg-red-500' : daysLeft <= 7 ? 'bg-amber-500' : 'bg-emerald-500';
                return (
                  <div key={member.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-center gap-4 hover:border-slate-300 transition-all cursor-pointer group">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center font-black text-slate-600 uppercase text-lg border border-slate-100">{member.fullName.charAt(0)}</div>
                      <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${statusColor}`}></div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-xs uppercase text-slate-800">{member.fullName}</h4>
                        <span className="text-[8px] font-black uppercase bg-slate-50 px-2 py-0.5 rounded-full text-slate-400">{member.serviceCategory}</span>
                        {!schemaError && member.welcomeSent && (
                          <span title="Welcome Sent">
                            <CheckCircle2 size={12} className="text-emerald-500" />
                          </span>
                        )}
                      </div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">
                        {member.phoneNumber} • {daysLeft < 0 ? 'Expired' : `${daysLeft}d left`}
                        {!schemaError && member.reminderCount > 0 && <span className="ml-2 text-slate-300">• {member.reminderCount} reminders</span>}
                      </p>
                      {pending > 0 && (
                        <p className="text-[8px] font-black text-red-500 uppercase mt-1">Pending: ₹{pending}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {!schemaError && !member.welcomeSent && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); sendWhatsAppReminder(member, 'welcome'); }} 
                          className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100"
                          title="Send Welcome"
                        >
                          <Send size={14} />
                        </button>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); setEditingMember(member); setFormData({ ...member, phoneNumber: member.phoneNumber.replace('+91',''), paymentReceived: member.totalPaid }); setShowEnrollModal(true); }} className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100"><Edit2 size={14} /></button>
                      <button onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/${member.phoneNumber.replace(/\D/g,'')}`, '_blank'); }} className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100"><MessageCircle size={14} /></button>
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
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Activity Timeline</h3>
                </div>
                <button onClick={fetchData} className="text-[8px] font-black text-emerald-500 uppercase px-3 py-1.5 bg-emerald-50 rounded-lg">Refresh Today</button>
              </div>
              <div className="space-y-6">
                <div>
                  <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-2"><div className="h-[1px] flex-1 bg-slate-100"></div>Today<div className="h-[1px] flex-1 bg-slate-100"></div></h4>
                  <div className="space-y-4">
                    {logsByDay.today.length > 0 ? logsByDay.today.map(log => (
                      <div key={log.id} className="relative pl-6 pb-4 border-l border-slate-100 last:pb-0">
                        <div className={`absolute -left-[5px] top-1.5 w-2 h-2 rounded-full ${log.action.includes('ENROLL') ? 'bg-emerald-500' : log.action.includes('UPDATE') ? 'bg-amber-500' : 'bg-slate-300'}`}></div>
                        <div className="flex justify-between items-start mb-1">
                          <div className="flex items-center gap-2">
                            <p className="text-[10px] font-black uppercase text-slate-800">{log.action}</p>
                            {log.memberName && (
                              <span className="flex items-center gap-1 text-[8px] font-black uppercase bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                                <UserCheck size={10} /> {log.memberName}
                              </span>
                            )}
                          </div>
                          <p className="text-[8px] text-slate-300 font-black">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                        <p className="text-[11px] text-slate-600 font-medium leading-tight">{log.details}</p>
                        
                        {(log.oldValue || log.newValue) && (
                          <div className="mt-2 bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-1.5">
                             {log.oldValue && (
                               <div className="flex items-start gap-2">
                                 <span className="text-[8px] font-black uppercase text-red-400 shrink-0 mt-1">Old:</span>
                                 <p className="text-[9px] font-bold text-slate-500 leading-tight italic">{log.oldValue}</p>
                               </div>
                             )}
                             {log.newValue && (
                               <div className="flex items-start gap-2">
                                 <span className="text-[8px] font-black uppercase text-emerald-500 shrink-0 mt-1">New:</span>
                                 <p className="text-[9px] font-bold text-slate-800 leading-tight">{log.newValue}</p>
                               </div>
                             )}
                          </div>
                        )}
                        <p className="text-[8px] text-slate-400 font-black uppercase mt-1.5 flex items-center gap-1.5 italic">
                          <UserIcon size={10} className="text-slate-300" /> 
                          By: <span className="text-slate-600 font-black">{log.userName}</span>
                        </p>
                      </div>
                    )) : <p className="text-center py-4 text-[9px] font-black text-slate-300 uppercase tracking-widest">No activity recorded today</p>}
                  </div>
                </div>
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
                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1.5 block">Full Name *</label>
                      <div className="relative">
                        <UserIcon size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" />
                        <input 
                          type="text" 
                          placeholder="Full Name" 
                          value={formData.fullName} 
                          onChange={e => {
                            const val = e.target.value;
                            if (validateName(val)) {
                              setFormData(p => ({...p, fullName: val}));
                            }
                          }} 
                          className={`w-full bg-slate-50 border ${enrollNameError ? 'border-red-300 ring-2 ring-red-100' : 'border-slate-100'} rounded-2xl pl-14 pr-5 py-4 font-bold outline-none focus:ring-2 focus:ring-slate-200 transition-all`} 
                        />
                      </div>
                      {enrollNameError && (
                        <div className="flex items-center gap-1 mt-1 px-1">
                          <AlertCircle size={10} className="text-red-500" />
                          <p className="text-red-500 text-[8px] font-black uppercase">{enrollNameError}</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1.5 block">WhatsApp Number *</label>
                      <div className="relative">
                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-500 font-black text-xs">+91</span>
                        <input 
                          type="tel" 
                          maxLength={10} 
                          value={formData.phoneNumber} 
                          onChange={e => {
                            const val = e.target.value.replace(/\D/g, '');
                            if (validatePhone(val)) {
                              setFormData(p => ({...p, phoneNumber: val}));
                            }
                          }} 
                          className={`w-full bg-slate-50 border ${enrollPhoneError ? 'border-red-300 ring-2 ring-red-100' : 'border-slate-100'} rounded-2xl pl-14 pr-5 py-4 font-bold outline-none focus:ring-2 focus:ring-slate-200 transition-all`} 
                        />
                      </div>
                      {enrollPhoneError && (
                        <div className="flex items-center gap-1 mt-1 px-1">
                          <AlertCircle size={10} className="text-red-500" />
                          <p className="text-red-500 text-[8px] font-black uppercase">{enrollPhoneError}</p>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1.5 block">Birthdate</label>
                        <div className="relative">
                          <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                          <input 
                            ref={birthdateInputRef}
                            type="date" 
                            max={todayStr} 
                            value={formData.birthdate} 
                            onChange={e => setFormData(p => ({...p, birthdate: e.target.value}))} 
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-11 pr-3 py-4 font-bold outline-none focus:ring-2 focus:ring-slate-200 text-xs" 
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1.5 block">Gender</label>
                        <div className="flex gap-2">
                          {(['MALE', 'FEMALE'] as Gender[]).map(g => (
                            <button 
                              key={g} 
                              type="button"
                              onClick={() => setFormData(p => ({...p, gender: g}))} 
                              className={`flex-1 py-3.5 rounded-xl text-[9px] font-black uppercase border transition-all ${formData.gender === g ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-white border-slate-100 text-slate-400'}`}
                            >
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
                        <button key={type} type="button" onClick={() => setFormData(p => ({...p, membershipType: type}))} className={`py-3 rounded-xl text-[10px] font-black uppercase border transition-all ${formData.membershipType === type ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-400 border-slate-100'}`}>
                          {type === 'COUPLE' ? 'Couple / 2P' : 'Single'}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {(['GYM', 'MMA'] as ServiceCategory[]).map(cat => (
                        <button key={cat} type="button" onClick={() => setFormData(p => ({...p, serviceCategory: cat}))} className={`py-3 rounded-xl text-[10px] font-black uppercase border transition-all ${formData.serviceCategory === cat ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-400 border-slate-100'}`}>
                          {cat}
                        </button>
                      ))}
                    </div>

                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1.5 block">Select Package</label>
                      <select value={formData.packageId} onChange={e => setFormData(p => ({...p, packageId: e.target.value}))} className="w-full bg-white border border-slate-100 rounded-2xl px-5 py-4 text-xs font-black outline-none focus:ring-2 focus:ring-slate-200">
                        {filteredPackagesForForm.map(pkg => (
                          <option key={pkg.id} value={pkg.id}>{pkg.name} — ₹{pkg.price}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1.5 block">Joining Date</label>
                        <div className="relative">
                          <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                          <input 
                            ref={joiningDateInputRef}
                            type="date" 
                            max={todayStr}
                            value={formData.joiningDate} 
                            onChange={e => setFormData(p => ({...p, joiningDate: e.target.value}))} 
                            onClick={() => safeShowPicker(joiningDateInputRef.current)}
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-11 pr-3 py-4 font-bold text-xs" 
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1.5 block">Renewal Date</label>
                        <div className="relative">
                          <CalendarDays size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none" />
                          <input 
                            type="date" 
                            readOnly 
                            value={calculatedExpiryDate} 
                            className="w-full bg-emerald-50 border border-emerald-100 rounded-2xl pl-11 pr-3 py-4 font-bold text-xs text-emerald-700 outline-none" 
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 bg-slate-50 p-4 rounded-3xl border border-slate-100">
                      <div>
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1.5 block">Paid Amount (₹)</label>
                        <div className="relative">
                          <span className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-500 font-black">₹</span>
                          <input 
                            type="number" 
                            min="0"
                            value={formData.paymentReceived === 0 ? '' : formData.paymentReceived} 
                            onChange={e => {
                              const val = e.target.value === '' ? '' : Number(e.target.value);
                              setFormData(p => ({...p, paymentReceived: val as any}));
                            }} 
                            className="w-full bg-white border border-slate-100 rounded-2xl pl-10 pr-5 py-4 font-black outline-none" 
                            placeholder="Enter Amount" 
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between px-2 pt-2 border-t border-slate-200/50">
                        <span className="text-[9px] font-black uppercase text-slate-400">Fee: ₹{selectedPackageData.price}</span>
                        <span className={`text-sm font-black ${pendingAmount > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                          Pending: ₹{pendingAmount}
                        </span>
                      </div>
                    </div>
                  </div>
                </FormSection>

                <button onClick={handleEnrollment} disabled={isSyncing} className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-transform disabled:opacity-50">
                  {isSyncing ? <RefreshCw className="animate-spin" size={20} /> : <ShieldCheck size={20} />}
                  {isSyncing ? 'SYNCING...' : editingMember ? 'UPDATE MEMBER' : 'ENROLL MEMBER'}
                </button>
              </div>
            ) : (
              <div className="text-center py-10 space-y-6">
                <div className="bg-emerald-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto text-emerald-500 shadow-inner">
                  <ShieldCheck size={48} />
                </div>
                <div>
                  <h3 className="text-2xl font-black uppercase">Success</h3>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Database Record Updated</p>
                </div>
                <button onClick={closeEnrollmentFlow} className="w-full bg-emerald-500 text-white py-5 rounded-3xl font-black shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">OK</button>
              </div>
            )}
          </div>
        </div>

        {/* Highlighted Creator Credit */}
        <div className="mt-8 mb-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-full inline-block shadow-sm border border-emerald-100">
            created by <span className="font-black">Vishwajeet Bhangare (9595107293)</span>
          </p>
        </div>
      </main>
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default App;
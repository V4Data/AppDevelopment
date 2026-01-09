
import React, { useState, useMemo, useEffect, useRef } from 'react';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import FormSection from './components/FormSection';
import { MembershipType, RegistrationData, NavTab, ServiceCategory, Member, MemberTab, User, LogEntry, Package } from './types';
import { PACKAGES } from './constants';
import { jsPDF } from 'jspdf';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  CreditCard, 
  Search, 
  Plus, 
  X, 
  History, 
  ArrowRight,
  ShieldCheck,
  UserPlus,
  Lock,
  Download,
  AlertCircle,
  FileSpreadsheet,
  MessageCircle,
  Mail,
  BarChart3,
  Edit2,
  FileText,
  Calendar,
  Share2,
  Upload,
  Database,
  RefreshCw,
  Clock
} from 'lucide-react';

const MASTER_KEY = '240596';
const ALLOWED_MANAGEMENT_PHONES = ['9595107293', '9130368298', '9823733536'];

const App: React.FC = () => {
  // Session State
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('thecage_session');
    return saved ? JSON.parse(saved) : null;
  });

  // UI State
  const [activeTab, setActiveTab] = useState<NavTab>('HOME');
  const [memberTab, setMemberTab] = useState<MemberTab>('ALL');
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [enrollmentSuccess, setEnrollmentSuccess] = useState<Member | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  // Refs for file inputs
  const memberFileRef = useRef<HTMLInputElement>(null);
  const logFileRef = useRef<HTMLInputElement>(null);

  // Validation States
  const [loginPhone, setLoginPhone] = useState('');
  const [loginError, setLoginError] = useState('');
  const [enrollPhoneError, setEnrollPhoneError] = useState('');
  const [paymentError, setPaymentError] = useState('');

  // Persistent Data State
  const [members, setMembers] = useState<Member[]>(() => {
    const saved = localStorage.getItem('thecage_members');
    return saved ? JSON.parse(saved) : [];
  });
  const [logs, setLogs] = useState<LogEntry[]>(() => {
    const saved = localStorage.getItem('thecage_logs');
    return saved ? JSON.parse(saved) : [];
  });

  // Incremental Archive State (Master persistence)
  const [lastAutoSync, setLastAutoSync] = useState<string>(() => {
    return localStorage.getItem('thecage_last_sync') || '';
  });

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

  // Sync Persistence
  useEffect(() => { localStorage.setItem('thecage_members', JSON.stringify(members)); }, [members]);
  useEffect(() => { localStorage.setItem('thecage_logs', JSON.stringify(logs)); }, [logs]);
  useEffect(() => { localStorage.setItem('thecage_session', JSON.stringify(currentUser)); }, [currentUser]);
  useEffect(() => { localStorage.setItem('thecage_last_sync', lastAutoSync); }, [lastAutoSync]);

  // Helper: Incremental Archiver Logic
  const performIncrementalSnapshot = (force = false) => {
    setIsSyncing(true);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    // Member Archiving (Incremental)
    const archivedMembersRaw = localStorage.getItem('thecage_archive_members');
    let archivedMembers: Member[] = archivedMembersRaw ? JSON.parse(archivedMembersRaw) : [];
    const archivedMemberIds = new Set(archivedMembers.map(m => m.id));
    
    const newMembers = members.filter(m => !archivedMemberIds.has(m.id));
    if (newMembers.length > 0) {
      archivedMembers = [...archivedMembers, ...newMembers];
      localStorage.setItem('thecage_archive_members', JSON.stringify(archivedMembers));
    }

    // Log Archiving (Incremental)
    const archivedLogsRaw = localStorage.getItem('thecage_archive_logs');
    let archivedLogs: LogEntry[] = archivedLogsRaw ? JSON.parse(archivedLogsRaw) : [];
    const archivedLogIds = new Set(archivedLogs.map(l => l.id));
    
    const newLogs = logs.filter(l => !archivedLogIds.has(l.id));
    if (newLogs.length > 0) {
      archivedLogs = [...archivedLogs, ...newLogs];
      localStorage.setItem('thecage_archive_logs', JSON.stringify(archivedLogs));
    }

    setLastAutoSync(now.toISOString());
    
    // Visual feedback
    setTimeout(() => setIsSyncing(false), 1500);
    if (force) {
      addLog('MANUAL_SYNC', `Incremental snapshot performed successfully. New records: ${newMembers.length} members, ${newLogs.length} logs.`);
    }
  };

  // Automated Scheduler: 11:59 PM Check
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const todayStr = now.toISOString().split('T')[0];

      // Check if it's 11:59 PM and we haven't synced today yet
      if (hours === 23 && minutes === 59) {
        if (!lastAutoSync || lastAutoSync.split('T')[0] !== todayStr) {
          performIncrementalSnapshot();
          addLog('AUTO_EXPORT', `Scheduled 11:59 PM incremental snapshot performed.`);
        }
      }
    }, 60000); // Check every minute

    return () => clearInterval(timer);
  }, [lastAutoSync, members, logs]);

  // Helper: Add Log
  const addLog = (action: string, details: string, phoneOverride?: string, oldValue?: string, newValue?: string) => {
    const staffPhone = phoneOverride || currentUser?.phoneNumber || 'Unknown';
    const newLog: LogEntry = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      userName: `Management (${staffPhone})`,
      userPhone: staffPhone,
      action,
      details: `${details} | Action by: ${staffPhone}`,
      timestamp: new Date().toISOString(),
      oldValue,
      newValue
    };
    setLogs(prev => [newLog, ...prev]);
  };

  const getRemainingDays = (expiryDate: string) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const expiry = new Date(expiryDate).getTime();
    return Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  };

  /**
   * Generates a PDF receipt and returns it as a File object for sharing
   */
  const generateReceiptFile = (member: Member): { file: File, doc: jsPDF } => {
    const doc = new jsPDF();
    const pkg = PACKAGES.find(p => p.id === member.packageId);
    const pending = member.totalFee - member.totalPaid;
    
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('THE CAGE MMA-GYM & RS ZUMBA', 20, 25);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('OFFICIAL MEMBERSHIP RECEIPT', 20, 32);
    
    doc.setTextColor(100, 116, 139);
    doc.text(`Receipt ID: TC-${member.id.slice(-6)}`, 140, 25);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 140, 32);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('MEMBER DETAILS', 20, 55);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Name: ${member.fullName}`, 20, 65);
    doc.text(`Phone: ${member.phoneNumber}`, 20, 72);
    doc.text(`Email: ${member.email || 'N/A'}`, 20, 79);
    
    doc.setFont('helvetica', 'bold');
    doc.text('MEMBERSHIP DETAILS', 20, 95);
    doc.setFont('helvetica', 'normal');
    doc.text(`Category: ${member.serviceCategory}`, 20, 105);
    doc.text(`Plan: ${pkg?.name || 'Standard'}`, 20, 112);
    doc.text(`Start Date: ${new Date(member.joiningDate).toLocaleDateString()}`, 20, 119);
    doc.text(`End Date: ${new Date(member.expiryDate).toLocaleDateString()}`, 20, 126);

    doc.setFillColor(248, 250, 252);
    doc.rect(20, 140, 170, 40, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('PAYMENT SUMMARY', 25, 150);
    doc.setFont('helvetica', 'normal');
    doc.text('Total Fees:', 25, 160);
    doc.text(`INR ${member.totalFee.toLocaleString()}`, 140, 160, { align: 'right' });
    doc.text('Amount Paid:', 25, 167);
    doc.setTextColor(16, 185, 129);
    doc.text(`INR ${member.totalPaid.toLocaleString()}`, 140, 167, { align: 'right' });
    doc.setTextColor(15, 23, 42);
    doc.text('Pending Balance:', 25, 174);
    if (pending > 0) doc.setTextColor(239, 68, 68);
    doc.text(`INR ${pending.toLocaleString()}`, 140, 174, { align: 'right' });

    doc.setTextColor(148, 163, 184);
    doc.setFontSize(8);
    doc.text('This is a computer-generated receipt. Thank you for training at The Cage!', 105, 285, { align: 'center' });

    const blob = doc.output('blob');
    const fileName = `Receipt_${member.fullName.replace(/\s+/g, '_')}.pdf`;
    const file = new File([blob], fileName, { type: 'application/pdf' });
    
    return { file, doc };
  };

  const handleReceiptDownload = (member: Member) => {
    const { doc } = generateReceiptFile(member);
    const fileName = `Receipt_${member.fullName.replace(/\s+/g, '_')}.pdf`;
    doc.save(fileName);
    addLog('RECEIPT_DOWNLOAD', `Downloaded receipt for ${member.fullName}`);
  };

  const sendSmartWhatsApp = (member: Member) => {
    const diffDays = getRemainingDays(member.expiryDate);
    let message = "";
    let actionType = "WHATSAPP_CHAT";

    if (diffDays < 0) {
      message = `Dear ${member.fullName}, we've missed seeing you at The Cage MMA-Gym & RS Zumba! 🥊\n\n` +
        `We'd love to have you back on the mats training with us. If you have a moment, could you please provide some feedback on how we can improve? Your experience matters to us.\n\n` +
        `Check out our latest training schedules! Best regards, The Cage MMA-Gym & RS Zumba Team.`;
      actionType = "WHATSAPP_FEEDBACK";
    } else if (diffDays <= 15) {
      message = `Hello ${member.fullName}, this is a friendly reminder from The Cage MMA-Gym & RS Zumba Team. 🥊\n\n` +
        `Your membership is due for renewal in ${diffDays} days. We'd love to see you continue your training journey with us! Please contact the front desk for renewal options.\n\n` +
        `Best regards, The Cage MMA-Gym & RS Zumba Team.`;
      actionType = "WHATSAPP_RENEWAL";
    } else {
      message = `Welcome to The Cage MMA-Gym & RS Zumba Family, ${member.fullName}! 🥊\n\n` +
        `Your enrollment is confirmed. Your official receipt will be sent to you on WhatsApp.\n\n` +
        `We are thrilled to have you! Please ask The Cage management team to include you into Cage_family WhatsApp group for updates and training tips.\n\n` +
        `Let's train hard! Best regards, The Cage MMA-Gym & RS Zumba Team.`;
      actionType = "WHATSAPP_WELCOME";
    }

    let phone = member.phoneNumber.replace(/\D/g, '');
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${phone}?text=${encodedMessage}`, '_blank');
    addLog(actionType, `Sent automated message to ${member.fullName} (${member.phoneNumber})`);
  };

  /**
   * Automatically handles sending the welcome message and attaching the receipt PDF
   */
  const handleWelcomeAndReceiptShare = async (member: Member) => {
    const { file, doc } = generateReceiptFile(member);
    const message = `Welcome to The Cage MMA-Gym & RS Zumba Family, ${member.fullName}! 🥊\n\n` +
      `Your enrollment is confirmed. Your official receipt is attached here.\n\n` +
      `We are thrilled to have you! Please ask The Cage management team to include you into Cage_family WhatsApp group for updates and training tips.\n\n` +
      `Let's train hard! Best regards, The Cage MMA-Gym & RS Zumba Team.`;

    // Try Web Share API (Best for mobile WhatsApp attachment)
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'Membership Receipt',
          text: message,
        });
        addLog('WHATSAPP_SHARE', `Shared welcome and receipt with ${member.fullName}`);
        return;
      } catch (error) {
        console.error('Sharing failed', error);
      }
    }

    // Fallback for desktop or non-sharing browsers: Text Chat + Auto Download
    const phone = member.phoneNumber.replace(/\D/g, '');
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${phone}?text=${encodedMessage}`, '_blank');
    doc.save(file.name);
    addLog('WHATSAPP_FALLBACK', `Sent welcome message (text) and triggered download for ${member.fullName}`);
  };

  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const key = data.get('masterKey') as string;
    
    const phoneClean = loginPhone.replace(/\D/g, '');
    if (phoneClean.length !== 10) {
      setLoginError('ENTER 10-DIGIT NUMBER');
      return;
    }

    if (!ALLOWED_MANAGEMENT_PHONES.includes(phoneClean)) {
      setLoginError('UNAUTHORIZED NUMBER');
      return;
    }

    if (key === MASTER_KEY) {
      const fullPhone = `+91${phoneClean}`;
      const user = { phoneNumber: fullPhone, loginTime: new Date().toISOString() };
      setCurrentUser(user);
      addLog('LOGIN', `Management session started`, fullPhone);
    } else {
      alert('Invalid Master Key.');
    }
  };

  const handleLogout = () => {
    addLog('LOGOUT', `Management session ended`);
    setCurrentUser(null);
    localStorage.removeItem('thecage_session');
  };

  const filteredPackages = useMemo(() => {
    return PACKAGES.filter(pkg => {
      const matchCategory = pkg.category === formData.serviceCategory;
      if (formData.membershipType === MembershipType.COUPLE) {
        return matchCategory && pkg.isCoupleOnly;
      }
      return matchCategory && !pkg.isCoupleOnly;
    });
  }, [formData.serviceCategory, formData.membershipType]);

  const selectedPackage = useMemo(() => {
    return PACKAGES.find(p => p.id === formData.packageId) || filteredPackages[0] || PACKAGES[0];
  }, [formData.packageId, filteredPackages]);

  const totalAmount = selectedPackage ? selectedPackage.price : 0;
  const pendingAmountValue = Math.max(0, totalAmount - formData.paymentReceived);

  const stats = useMemo(() => {
    const now = new Date();
    const chartData = [];
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mLabel = date.toLocaleString('default', { month: 'short' });
      const rev = members.filter(m => {
        const d = new Date(m.joiningDate);
        return d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear();
      }).reduce((acc, m) => acc + m.totalPaid, 0);
      
      chartData.push({ month: mLabel, revenue: rev, isCurrent: i === 0 });
    }

    const activeCount = members.filter(m => new Date(m.expiryDate) >= now).length;
    const currentRevenue = chartData[chartData.length - 1].revenue;
    
    return { 
      chartData,
      activeCount,
      currentRevenue,
      currentMonthName: now.toLocaleString('default', { month: 'long' })
    };
  }, [members]);

  const segmentedMembers = useMemo(() => {
    const query = searchQuery.toLowerCase();
    
    let filtered = members.filter(m => 
      m.fullName.toLowerCase().includes(query) || 
      m.phoneNumber.includes(query)
    );

    return filtered.filter(m => {
      const diffDays = getRemainingDays(m.expiryDate);
      
      switch (memberTab) {
        case 'ACTIVE': return diffDays >= 0; 
        case '7DAYS': return diffDays >= 0 && diffDays <= 7;
        case '15DAYS': return diffDays > 7 && diffDays <= 15;
        case 'INACTIVE': return diffDays < 0;
        case 'ALL': return true;
        default: return true;
      }
    });
  }, [members, memberTab, searchQuery]);

  const handleEnrollment = () => {
    const phoneDigits = formData.phoneNumber;
    if (phoneDigits.length !== 10) {
      setEnrollPhoneError('ENTER 10-DIGIT NUMBER');
      return;
    }

    const joining = new Date(formData.joiningDate);
    const expiry = new Date(joining);
    expiry.setDate(expiry.getDate() + selectedPackage.durationDays);

    if (editingMember) {
      const updated = members.map(m => m.id === editingMember.id ? {
        ...m,
        fullName: formData.fullName,
        phoneNumber: `+91${phoneDigits}`,
        email: formData.email,
        membershipType: formData.membershipType,
        serviceCategory: formData.serviceCategory,
        packageId: formData.packageId,
        joiningDate: joining.toISOString(),
        expiryDate: expiry.toISOString(),
        totalPaid: Number(formData.paymentReceived),
        totalFee: totalAmount,
      } : m);
      setMembers(updated);
      closeEnrollmentFlow();
      return;
    }

    const newMember: Member = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      fullName: formData.fullName,
      phoneNumber: `+91${phoneDigits}`,
      email: formData.email,
      membershipType: MembershipType.SINGLE,
      serviceCategory: formData.serviceCategory,
      packageId: formData.packageId,
      joiningDate: joining.toISOString(),
      expiryDate: expiry.toISOString(),
      totalPaid: Number(formData.paymentReceived),
      totalFee: totalAmount,
    };

    setMembers(prev => [newMember, ...prev]);
    addLog('MEMBER_ENROLLED', `Enrolled member: ${newMember.fullName} (${newMember.phoneNumber})`);
    setEnrollmentSuccess(newMember);
  };

  const openEditModal = (member: Member) => {
    setEditingMember(member);
    setFormData({
      fullName: member.fullName,
      phoneNumber: member.phoneNumber.replace('+91', ''),
      email: member.email || '',
      membershipType: member.membershipType,
      serviceCategory: member.serviceCategory,
      packageId: member.packageId,
      joiningDate: new Date(member.joiningDate).toISOString().split('T')[0],
      paymentReceived: member.totalPaid,
    });
    setShowEnrollModal(true);
  };

  const closeEnrollmentFlow = () => {
    setShowEnrollModal(false);
    setEnrollmentSuccess(null);
    setEditingMember(null);
    setEnrollPhoneError('');
    setPaymentError('');
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
    setActiveTab('MEMBERS');
  };

  /**
   * Helper to parse simple CSV strings with quotes handling
   */
  const parseCSV = (csv: string) => {
    const lines = csv.split(/\r?\n/);
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const results = [];
    
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const row = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
      if (!row) continue;
      
      const obj: any = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] ? row[index].trim().replace(/^"|"$/g, '') : '';
      });
      results.push(obj);
    }
    return results;
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) return alert("No data to export.");
    let exportData = [];
    
    if (filename.includes('Members')) {
      exportData = (data as Member[]).map(m => ({
        'ID': m.id,
        'Member Name': m.fullName,
        'Phone Number': m.phoneNumber,
        'Email Address': m.email || '',
        'Membership Type': m.membershipType,
        'Service Category': m.serviceCategory,
        'Package ID': m.packageId,
        'Joining Date': m.joiningDate,
        'Expiry Date': m.expiryDate,
        'Total Fees': m.totalFee,
        'Total Paid': m.totalPaid
      }));
    } else {
      exportData = (data as LogEntry[]).map(l => ({
        'ID': l.id,
        'Timestamp': l.timestamp,
        'Action Type': l.action,
        'Staff Phone': l.userPhone,
        'Action Details': l.details
      }));
    }
    
    const headers = Object.keys(exportData[0]);
    const csv = [headers.join(','), ...exportData.map(r => headers.map(f => `"${r[f]}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    addLog('EXPORT', `Exported ${filename} CSV`);
  };

  const handleImportMembers = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const csv = event.target?.result as string;
      const rows = parseCSV(csv);
      const imported = rows.map(r => ({
        id: r['ID'] || Date.now().toString() + Math.random().toString(36).substr(2, 5),
        fullName: r['Member Name'] || 'Unknown',
        phoneNumber: r['Phone Number'] || '',
        email: r['Email Address'] || '',
        membershipType: r['Membership Type'] as MembershipType || MembershipType.SINGLE,
        serviceCategory: r['Service Category'] as ServiceCategory || ServiceCategory.GYM,
        packageId: r['Package ID'] || PACKAGES[0].id,
        joiningDate: r['Joining Date'] || new Date().toISOString(),
        expiryDate: r['Expiry Date'] || new Date().toISOString(),
        totalFee: Number(r['Total Fees']) || 0,
        totalPaid: Number(r['Total Paid']) || 0,
      }));
      setMembers(prev => {
        const map = new Map(prev.map(m => [m.id, m]));
        imported.forEach(im => map.set(im.id, im));
        return Array.from(map.values());
      });
      addLog('IMPORT', `Imported ${imported.length} members`);
      alert(`Imported ${imported.length} members!`);
    };
    reader.readAsText(file);
  };

  const handleImportLogs = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const csv = event.target?.result as string;
      const rows = parseCSV(csv);
      const imported = rows.map(r => ({
        id: r['ID'] || Date.now().toString() + Math.random().toString(36).substr(2, 5),
        userName: 'Imported',
        userPhone: r['Staff Phone'] || 'Unknown',
        action: r['Action Type'] || 'LOG',
        details: r['Action Details'] || '',
        timestamp: r['Timestamp'] || new Date().toISOString()
      }));
      setLogs(prev => {
        const map = new Map(prev.map(l => [l.id, l]));
        imported.forEach(il => map.set(il.id, il));
        return Array.from(map.values()).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      });
      addLog('IMPORT', `Imported ${imported.length} logs`);
      alert(`Imported ${imported.length} logs!`);
    };
    reader.readAsText(file);
  };

  const downloadMasterArchive = (type: 'Members' | 'Logs') => {
    const key = `thecage_archive_${type.toLowerCase()}`;
    const raw = localStorage.getItem(key);
    if (!raw) return alert("No archived data found for this device yet.");
    const data = JSON.parse(raw);
    exportToCSV(data, `Incremental_Master_${type}_Archive`);
  };

  if (!currentUser) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-black">
      <div className="w-full max-w-sm bg-white p-10 rounded-[40px] shadow-2xl">
        <div className="bg-emerald-500 w-16 h-16 rounded-3xl flex items-center justify-center mb-8 mx-auto text-white shadow-lg">
          <ShieldCheck size={32} />
        </div>
        <h2 className="text-2xl font-black mb-8 text-center uppercase tracking-tight text-slate-800">Management Login</h2>
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">+91</span>
              <input 
                type="tel"
                required
                value={loginPhone}
                maxLength={10}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val && !/^\d+$/.test(val)) setLoginError('ENTER VALID NUMBER');
                  else { setLoginError(''); setLoginPhone(val); }
                }}
                className={`w-full bg-slate-50 border ${loginError ? 'border-red-500' : 'border-slate-100'} rounded-2xl pl-12 pr-5 py-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-bold text-black`}
                placeholder=""
              />
            </div>
            {loginError && <p className="text-red-500 text-[9px] font-black uppercase tracking-widest ml-1">{loginError}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Master Key</label>
            <div className="relative">
              <input name="masterKey" type="password" required className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-5 py-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-black text-black" placeholder="••••••" />
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            </div>
          </div>
          <button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-5 rounded-3xl font-black active:scale-[0.98] transition-all flex items-center justify-center gap-3">
            SECURE ACCESS <ArrowRight size={18} />
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-28 text-black selection:bg-emerald-100">
      <Header user={currentUser} onLogout={handleLogout} />
      
      {/* Live Sync Status Bar */}
      <div className="bg-slate-900 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
           <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`}></div>
           <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
             {isSyncing ? 'Syncing Incremental Data...' : lastAutoSync ? `Last Snapshot: ${new Date(lastAutoSync).toLocaleString()}` : 'System Ready'}
           </span>
        </div>
        <button onClick={() => performIncrementalSnapshot(true)} className="text-[8px] font-black text-emerald-400 uppercase flex items-center gap-1">
          <RefreshCw size={10} className={isSyncing ? 'animate-spin' : ''} /> Sync Now
        </button>
      </div>

      <main className="max-w-2xl mx-auto px-4 pt-8">
        {activeTab === 'HOME' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
            <button onClick={() => setShowEnrollModal(true)} className="w-full bg-slate-900 text-white rounded-3xl p-6 flex items-center justify-between shadow-xl group">
              <div className="flex items-center gap-4">
                <div className="bg-emerald-500 p-3 rounded-2xl group-hover:rotate-90 transition-transform"><Plus size={24} /></div>
                <div className="text-left">
                  <h4 className="font-black uppercase text-sm">New Enrollment</h4>
                  <p className="text-slate-500 text-[9px] font-bold uppercase">Onboard member manually</p>
                </div>
              </div>
              <ArrowRight size={20} className="text-slate-700" />
            </button>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <span className="text-slate-400 font-bold text-[9px] uppercase tracking-widest block mb-1">{stats.currentMonthName} Revenue</span>
                <span className="text-2xl font-black text-black">₹{stats.currentRevenue.toLocaleString()}</span>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <span className="text-slate-400 font-bold text-[9px] uppercase tracking-widest block mb-1">Active Members</span>
                <span className="text-2xl font-black text-black">{stats.activeCount}</span>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                <BarChart3 size={18} className="text-indigo-500" />
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Last 6 Months Revenue</h3>
              </div>
              <div className="grid grid-cols-6 gap-2 h-44 px-2 items-end mb-4">
                {stats.chartData.map((data, idx) => {
                  const maxVal = Math.max(...stats.chartData.map(d => d.revenue), 1);
                  const h = (data.revenue / maxVal) * 100;
                  return (
                    <div key={idx} className="flex flex-col items-center gap-2 flex-1 group relative">
                      <div className="absolute -top-6 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[8px] font-black px-1.5 py-0.5 rounded pointer-events-none z-10">₹{data.revenue.toLocaleString()}</div>
                      <div className={`w-full rounded-t-lg transition-all duration-1000 ${data.isCurrent ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-slate-100'}`} style={{ height: `${h}%` }}></div>
                      <span className={`text-[8px] font-black uppercase ${data.isCurrent ? 'text-emerald-600' : 'text-slate-400'}`}>{data.month}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'MEMBERS' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="sticky top-16 bg-slate-50/95 backdrop-blur-sm z-30 pt-4 pb-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Find member..." 
                    value={searchQuery} 
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-bold shadow-sm text-black"
                  />
                </div>
                <button 
                  onClick={() => setShowEnrollModal(true)}
                  className="bg-slate-900 text-white w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                >
                  <Plus size={24} />
                </button>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {(['ALL', 'ACTIVE', '7DAYS', '15DAYS', 'INACTIVE'] as MemberTab[]).map(tab => (
                  <button key={tab} onClick={() => setMemberTab(tab)} className={`flex-shrink-0 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${memberTab === tab ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 border-slate-100'}`}>
                    {tab === 'ALL' ? 'All' : tab === 'ACTIVE' ? 'Active' : tab === '7DAYS' ? '7 Days' : tab === '15DAYS' ? '15 Days' : 'Inactive'}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              {segmentedMembers.map(member => (
                <div key={member.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-center gap-4 group hover:border-emerald-100 transition-colors">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center font-black text-slate-600 uppercase group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">{member.fullName.charAt(0)}</div>
                  <div className="flex-1">
                    <h4 className="font-black text-xs uppercase leading-none mb-1 text-black">{member.fullName}</h4>
                    <p className="text-[10px] font-bold text-slate-400">{member.phoneNumber}</p>
                    {getRemainingDays(member.expiryDate) >= 0 ? (
                      <p className="text-[9px] font-black text-emerald-600 uppercase mt-1">
                        Days Left: {getRemainingDays(member.expiryDate)}
                      </p>
                    ) : (
                      <p className="text-[9px] font-black text-red-500 uppercase mt-1">Membership Expired</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => openEditModal(member)} className="w-9 h-9 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center border border-slate-100 shadow-sm"><Edit2 size={14} /></button>
                    <button onClick={() => handleReceiptDownload(member)} className="w-9 h-9 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center border border-slate-100 shadow-sm"><FileText size={16} /></button>
                    <button 
                      onClick={() => sendSmartWhatsApp(member)} 
                      className={`w-9 h-9 ${getRemainingDays(member.expiryDate) < 0 ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'} rounded-xl flex items-center justify-center border shadow-sm`}
                      title="Send WhatsApp Message"
                    >
                      <MessageCircle size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {segmentedMembers.length === 0 && <p className="text-center py-20 text-slate-300 font-black text-[10px] uppercase tracking-widest">No matching records found</p>}
            </div>
          </div>
        )}

        {activeTab === 'LOGS' && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 pb-12">
            <input type="file" accept=".csv" ref={memberFileRef} className="hidden" onChange={handleImportMembers} />
            <input type="file" accept=".csv" ref={logFileRef} className="hidden" onChange={handleImportLogs} />

             <div className="grid grid-cols-2 gap-4">
              <button onClick={() => exportToCSV(members, 'Current_Members')} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center gap-3 text-black hover:bg-emerald-50/30 transition-colors">
                <FileSpreadsheet size={24} className="text-emerald-500" />
                <span className="text-[10px] font-black uppercase">Export Members</span>
              </button>
              <button onClick={() => memberFileRef.current?.click()} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center gap-3 text-black hover:bg-emerald-50/30 transition-colors">
                <Upload size={24} className="text-emerald-500" />
                <span className="text-[10px] font-black uppercase">Import Members</span>
              </button>
            </div>

            {/* Master Archive Center */}
            <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <Database size={18} className="text-indigo-500" />
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-800">Master Incremental Archive</h3>
              </div>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">Data in this section grows daily at 11:59 PM. It contains the complete history for this device.</p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => downloadMasterArchive('Members')} className="bg-slate-50 py-4 px-4 rounded-2xl border border-slate-100 flex items-center justify-between group hover:bg-indigo-50 transition-colors">
                  <span className="text-[9px] font-black uppercase">Members Archive</span>
                  <Download size={14} className="text-slate-400 group-hover:text-indigo-500" />
                </button>
                <button onClick={() => downloadMasterArchive('Logs')} className="bg-slate-50 py-4 px-4 rounded-2xl border border-slate-100 flex items-center justify-between group hover:bg-indigo-50 transition-colors">
                  <span className="text-[9px] font-black uppercase">Logs Archive</span>
                  <Download size={14} className="text-slate-400 group-hover:text-indigo-500" />
                </button>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-8 divide-y divide-slate-50">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={16} className="text-slate-400" />
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">System Logs</h3>
              </div>
              {logs.map(log => (
                <div key={log.id} className="flex gap-6 items-start pt-6 first:pt-0">
                  <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${log.action.includes('IMPORT') ? 'bg-indigo-500' : 'bg-emerald-500'}`}></div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-[10px] font-black uppercase text-slate-800 tracking-wider">{log.action}</p>
                      <p className="text-[8px] text-slate-400 font-black uppercase">{new Date(log.timestamp).toLocaleTimeString()}</p>
                    </div>
                    <p className="text-[11px] text-slate-600 font-bold leading-relaxed">{log.details}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Enrollment Modal */}
        <div className={`fixed inset-0 z-[100] transition-all duration-500 ${showEnrollModal ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={closeEnrollmentFlow}></div>
          <div className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-[40px] shadow-2xl transition-transform duration-500 transform ${showEnrollModal ? 'translate-y-0' : 'translate-y-full'} overflow-y-auto max-h-[95vh] pb-12`}>
            <div className="p-8">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-black uppercase tracking-tight text-black">{editingMember ? 'Edit Member' : enrollmentSuccess ? 'Success!' : 'New Enrollment'}</h2>
                <button onClick={closeEnrollmentFlow} className="w-10 h-10 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center"><X size={20} /></button>
              </div>

              {!enrollmentSuccess ? (
                <div className="space-y-6">
                  <FormSection title="Personal Information">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Full Name</label>
                      <input type="text" placeholder="" value={formData.fullName} onChange={e => setFormData(p => ({...p, fullName: e.target.value}))} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 font-bold text-black" />
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">WhatsApp Number</label>
                      <div className="relative">
                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xs">+91</span>
                        <input 
                          type="tel" 
                          placeholder="" 
                          maxLength={10} 
                          value={formData.phoneNumber} 
                          onChange={e => {
                            const val = e.target.value;
                            if (val && !/^\d+$/.test(val)) setEnrollPhoneError('ENTER VALID NUMBER');
                            else { setEnrollPhoneError(''); setFormData(p => ({...p, phoneNumber: val})); }
                          }} 
                          className={`w-full bg-slate-50 border ${enrollPhoneError ? 'border-red-500' : 'border-slate-100'} rounded-2xl pl-14 pr-5 py-4 font-bold text-black`} 
                        />
                      </div>
                      {enrollPhoneError && <p className="text-red-500 text-[9px] font-black uppercase tracking-widest ml-1">{enrollPhoneError}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Email Address</label>
                      <input type="email" placeholder="" value={formData.email} onChange={e => setFormData(p => ({...p, email: e.target.value}))} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 font-bold text-black" />
                    </div>
                  </FormSection>

                  <FormSection title="Plan Selection">
                    <div className="flex p-1.5 bg-slate-100 rounded-2xl gap-1">
                      {Object.values(ServiceCategory).map(cat => (
                        <button key={cat} onClick={() => setFormData(p => ({ ...p, serviceCategory: cat }))} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${formData.serviceCategory === cat ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400'}`}>{cat}</button>
                      ))}
                    </div>
                    <div className="flex p-1.5 bg-slate-100 rounded-2xl gap-1">
                      <button onClick={() => setFormData(p => ({ ...p, membershipType: MembershipType.SINGLE }))} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${formData.membershipType === MembershipType.SINGLE ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400'}`}>Single</button>
                      <button onClick={() => setFormData(p => ({ ...p, membershipType: MembershipType.COUPLE }))} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${formData.membershipType === MembershipType.COUPLE ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400'}`}>Couple / 2 Persons</button>
                    </div>
                    <select value={formData.packageId} onChange={e => setFormData(p => ({...p, packageId: e.target.value}))} className="w-full bg-white border border-slate-100 rounded-2xl px-5 py-4 text-sm font-black text-black">
                      {filteredPackages.map(pkg => <option key={pkg.id} value={pkg.id}>{pkg.name} — ₹{pkg.price}</option>)}
                    </select>
                    
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Joining Date</label>
                      <div className="relative">
                        <Calendar className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={18} />
                        <input 
                          type="date" 
                          value={formData.joiningDate} 
                          onChange={e => setFormData(p => ({...p, joiningDate: e.target.value}))} 
                          className="w-full bg-white border border-slate-100 rounded-2xl px-5 py-4 text-sm font-black text-black" 
                        />
                      </div>
                    </div>
                  </FormSection>

                  <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-xl">
                    <div className="flex justify-between items-end mb-8">
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Package Price</span>
                        <span className="text-4xl font-black text-black">₹{totalAmount.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Amount Paid</label>
                      <div className="relative">
                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 font-black text-xl">₹</span>
                        <input 
                          type="text" 
                          value={formData.paymentReceived || ''} 
                          onChange={e => {
                            const val = e.target.value.replace(/\D/g, '');
                            if (e.target.value && !/^\d+$/.test(e.target.value)) setPaymentError('ENTER VALID AMOUNT');
                            else { setPaymentError(''); setFormData(p => ({...p, paymentReceived: Number(val)})); }
                          }} 
                          className={`w-full bg-slate-50 border ${paymentError ? 'border-red-500' : 'border-slate-100'} rounded-[24px] pl-12 pr-6 py-5 font-black text-2xl focus:outline-none transition-all text-black`} 
                        />
                      </div>
                    </div>
                  </div>

                  <button onClick={handleEnrollment} className="w-full bg-slate-900 text-white py-6 rounded-[24px] font-black shadow-2xl active:scale-[0.98] transition-all uppercase tracking-widest">{editingMember ? 'Save Changes' : 'Confirm Enrollment'}</button>
                </div>
              ) : (
                <div className="space-y-10 py-6 text-center animate-in zoom-in">
                  <div className="bg-emerald-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto">
                    <ShieldCheck size={48} className="text-emerald-500" />
                  </div>
                  <h3 className="text-2xl font-black uppercase text-black">{enrollmentSuccess.fullName} Registered!</h3>
                  <button onClick={() => handleWelcomeAndReceiptShare(enrollmentSuccess)} className="w-full bg-emerald-500 text-white py-6 rounded-[28px] font-black flex items-center justify-center gap-3 shadow-lg shadow-emerald-500/20">
                    <Share2 /> SEND WELCOME & ATTACH RECEIPT
                  </button>
                  <button onClick={closeEnrollmentFlow} className="w-full bg-slate-100 text-slate-600 py-4 rounded-[24px] font-black">EXIT</button>
                </div>
              )}
            </div>
          </div>
        </div>

      </main>
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default App;

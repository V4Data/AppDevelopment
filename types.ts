export enum MembershipType {
  SINGLE = 'SINGLE',
  COUPLE = 'COUPLE'
}

export enum ServiceCategory {
  GYM = 'GYM',
  MMA = 'MMA'
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE'
}

export type NavTab = 'HOME' | 'MEMBERS' | 'LOGS' | 'DEVICES';

export type MemberTab = 'ALL' | 'ACTIVE' | 'INACTIVE' | '7DAYS' | '15DAYS';

export interface User {
  phoneNumber: string;
  name: string;
  sessionId?: string;
  loginTime?: string;
}

export interface Member {
  id: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  membershipType: MembershipType;
  serviceCategory: ServiceCategory;
  packageId: string;
  joiningDate: string;
  expiryDate: string;
  birthdate: string;
  gender: Gender;
  totalPaid: number;
  totalFee: number;
  pendingFee: number;
  welcomeSent: boolean;
  reminderCount: number;
  enrolledBy: string;
  enrolledByPhone: string;
  // Fee Waiver fields
  isPendingFeeWaivedOff: boolean;
  waivedOffAt: string | null;
  waivedOffBy: string | null;
}

export interface RegistrationData {
  fullName: string;
  phoneNumber: string;
  email: string;
  membershipType: MembershipType;
  serviceCategory: ServiceCategory;
  packageId: string;
  joiningDate: string;
  birthdate: string;
  gender: Gender;
  paymentReceived: number;
}

export interface LogEntry {
  id: string;
  userName: string;
  userPhone: string;
  memberId?: string;
  memberName?: string;
  action: string;
  details: string;
  oldValue?: string;
  newValue?: string;
  timestamp: string;
}

export interface ActiveSession {
  id: string;
  user_phone: string;
  user_name: string;
  device_type: string;
  device_id: string;
  ip_address?: string;
  login_time: string;
  last_active: string;
}

export interface Package {
  id: string;
  name: string;
  price: number;
  durationDays: number;
  category: ServiceCategory;
  isCoupleOnly: boolean;
}
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
  FEMALE = 'FEMALE',
  OTHER = 'OTHER'
}

export interface Package {
  id: string;
  name: string;
  price: number;
  category: ServiceCategory;
  isCoupleOnly: boolean;
  durationDays: number;
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
  welcomeSent: boolean;
  reminderCount: number;
}

export interface User {
  phoneNumber: string;
  loginTime: string;
  name: string;
  sessionId?: string;
}

export interface ActiveSession {
  id: string;
  user_phone: string;
  user_name: string;
  device_type: string;
  ip_address: string;
  device_id: string;
  login_time: string;
  last_active: string;
}

export interface LogEntry {
  id: string;
  userName: string; 
  userPhone: string;
  action: string;
  details: string;
  timestamp: string;
  memberId?: string;
  memberName?: string;
  oldValue?: string;
  newValue?: string;
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

export type NavTab = 'HOME' | 'MEMBERS' | 'LOGS' | 'DEVICES';
export type MemberTab = 'ALL' | 'ACTIVE' | '7DAYS' | '15DAYS' | 'INACTIVE';

export enum MembershipType {
  SINGLE = 'SINGLE',
  COUPLE = 'COUPLE'
}

export enum ServiceCategory {
  GYM = 'GYM',
  MMA = 'MMA'
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
  totalPaid: number;
  totalFee: number;
}

export interface User {
  phoneNumber: string;
  loginTime: string;
  name?: string;
}

export interface LogEntry {
  id: string;
  userName: string; 
  userPhone: string;
  action: string;
  details: string;
  timestamp: string;
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
  paymentReceived: number;
}

export type NavTab = 'HOME' | 'MEMBERS' | 'LOGS';
export type MemberTab = 'ALL' | 'ACTIVE' | '7DAYS' | '15DAYS' | 'INACTIVE';

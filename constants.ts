
import { Package, ServiceCategory } from './types';

export const PACKAGES: Package[] = [
  // Gym Packages
  { id: 'gym-1', category: ServiceCategory.GYM, name: '1 Month', price: 1500, isCoupleOnly: false, durationDays: 30 },
  { id: 'gym-3', category: ServiceCategory.GYM, name: '3 Months', price: 3500, isCoupleOnly: false, durationDays: 90 },
  { id: 'gym-6', category: ServiceCategory.GYM, name: '6 Months', price: 5000, isCoupleOnly: false, durationDays: 180 },
  { id: 'gym-12-2', category: ServiceCategory.GYM, name: '12 Months + 2 Months', price: 7500, isCoupleOnly: false, durationDays: 425 },
  { id: 'gym-12-2-c', category: ServiceCategory.GYM, name: 'Couple 12 Months + 2 Months', price: 14000, isCoupleOnly: true, durationDays: 425 },

  // MMA Packages
  { id: 'mma-1', category: ServiceCategory.MMA, name: '1 Month', price: 3000, isCoupleOnly: false, durationDays: 30 },
  { id: 'mma-3', category: ServiceCategory.MMA, name: '3 Months', price: 7500, isCoupleOnly: false, durationDays: 90 },
  { id: 'mma-6', category: ServiceCategory.MMA, name: '6 Months', price: 12000, isCoupleOnly: false, durationDays: 180 },
  { id: 'mma-12-2', category: ServiceCategory.MMA, name: '12 Months + 2 Months', price: 22000, isCoupleOnly: false, durationDays: 425 },
  { id: 'mma-12-2-c', category: ServiceCategory.MMA, name: 'Couple 12 Months + 2 Months', price: 38000, isCoupleOnly: true, durationDays: 425 },
];

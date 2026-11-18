import type { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Platform } from 'react-native';
import type { Role } from '../context/AuthContext';
import type { TranslationKey } from './i18n';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** Label, icon and "what opens after login" text per role (shared by login, OTP and the demo switcher). */
export const ROLE_META: Record<Role, { icon: IconName; label: TranslationKey; destination: TranslationKey }> = {
  patient: { icon: 'person-outline', label: 'rolePatient', destination: 'destPatient' },
  doctor: { icon: 'medkit-outline', label: 'roleDoctor', destination: 'destDoctor' },
  receptionist: { icon: 'desktop-outline', label: 'roleReceptionist', destination: 'destReceptionist' },
  pharmacist: { icon: 'medical-outline', label: 'rolePharmacist', destination: 'destPharmacist' },
  hospitalAdmin: { icon: 'business-outline', label: 'roleHospitalAdmin', destination: 'destHospitalAdmin' },
  superAdmin: { icon: 'shield-checkmark-outline', label: 'roleSuperAdmin', destination: 'destSuperAdmin' },
};

/** Roles that log in through the "Doctor / Staff" tab (admin roles only on web). */
export const STAFF_ROLES: readonly Role[] = Platform.OS === 'web'
  ? ['doctor', 'receptionist', 'pharmacist', 'hospitalAdmin', 'superAdmin']
  : ['doctor', 'receptionist', 'pharmacist'];

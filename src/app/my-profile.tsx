import React from 'react';
import { ProfileView } from '../components/ProfileView';
import { AppScreen, ScreenHeader } from '../components/ui';
import { useLanguage } from '../context/LanguageContext';
import { goBack } from '../utils/navigation';

/** Profile for doctor, receptionist, pharmacist and admin (opened from the Profile button in their area). */
export default function MyProfileScreen() {
  const { L } = useLanguage();
  return (
    <AppScreen header={<ScreenHeader title={L('myProfile')} onBack={() => goBack('/')} />}>
      <ProfileView />
    </AppScreen>
  );
}

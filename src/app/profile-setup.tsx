import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { ProfileForm } from '../components/ProfileForm';
import { EMPTY_PROFILE, useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { goBack } from '../utils/navigation';

/** Sign-up step 2: profile details after OTP. Continues to the PIN screen. */
export default function ProfileSetupScreen() {
  const { t, L } = useLanguage();
  const { pending, setPendingProfile, clearPending } = useAuth();

  // Opened without passing OTP (refresh / deep link): start again from login.
  useEffect(() => {
    if (!pending) router.replace('/login');
  }, [pending]);

  return (
    <ProfileForm
      initial={EMPTY_PROFILE}
      title={L('profileSetupTitle')}
      subtitle={L('profileSetupSubtitle')}
      submitLabel={t('pfSave')}
      onSubmit={(profile) => {
        setPendingProfile(profile);
        router.push('/set-pin');
      }}
      onBack={() => {
        clearPending();
        goBack('/login');
      }}
    />
  );
}

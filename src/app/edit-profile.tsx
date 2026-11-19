import React from 'react';
import { ProfileForm } from '../components/ProfileForm';
import { EMPTY_PROFILE, useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { goBack } from '../utils/navigation';

/** Profile tab → Edit: same form as sign-up, saved with updateMe(). */
export default function EditProfileScreen() {
  const { t, L } = useLanguage();
  const { profile, updateProfile } = useAuth();

  return (
    <ProfileForm
      initial={{ ...EMPTY_PROFILE, ...profile }}
      title={L('editProfileTitle')}
      subtitle={L('editProfileSubtitle')}
      submitLabel={t('pfSaveChanges')}
      onSubmit={async (next) => {
        await updateProfile(next);
        goBack('/(tabs)/profile');
      }}
      onBack={() => goBack('/(tabs)/profile')}
    />
  );
}

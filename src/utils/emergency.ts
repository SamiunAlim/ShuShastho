import { Linking } from 'react-native';
import { isBackendConfigured, postEmergencyAlert } from '../services/api';
import { setOffline } from '../services/connection';

type AlertInfo = Parameters<typeof postEmergencyAlert>[0];

/**
 * Opens the dialer for 999 immediately. Nothing may delay this call, so it must be
 * invoked straight from the press handler (no confirmation dialog).
 * When `alert` is given, the emergency alert is POSTed to the backend afterwards, in the background:
 * it never blocks or delays the call, and a failure is ignored (it only flips the offline badge).
 */
export function call999(onUnavailable?: () => void, alert?: AlertInfo) {
  Linking.openURL('tel:999').catch(() => onUnavailable?.());
  if (alert && isBackendConfigured()) {
    postEmergencyAlert(alert)
      .then(() => setOffline(false))
      .catch(() => setOffline(true));
  }
}

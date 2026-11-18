import { Linking } from 'react-native';

/**
 * Opens the dialer for 999 immediately. Nothing may delay this call, so it must be
 * invoked straight from the press handler (no confirmation dialog).
 */
export function call999(onUnavailable?: () => void) {
  Linking.openURL('tel:999').catch(() => onUnavailable?.());
}

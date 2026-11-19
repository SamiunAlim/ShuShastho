import type { Localized } from '../services/mock';

export type Coords = { lat: number; lng: number };

/** Great-circle distance in km (haversine). */
export function distanceKm(a: Coords, b: Coords): number {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

/** Fallback origins when the device location is unavailable (approximate area centres). */
export const AREAS: { id: string; name: Localized; coords: Coords }[] = [
  { id: 'dhanmondi', name: { en: 'Dhanmondi', bn: 'ধানমন্ডি' }, coords: { lat: 23.7461, lng: 90.3742 } },
  { id: 'mirpur', name: { en: 'Mirpur', bn: 'মিরপুর' }, coords: { lat: 23.8069, lng: 90.3687 } },
  { id: 'mohammadpur', name: { en: 'Mohammadpur', bn: 'মোহাম্মদপুর' }, coords: { lat: 23.7662, lng: 90.3589 } },
  { id: 'gulshan', name: { en: 'Gulshan', bn: 'গুলশান' }, coords: { lat: 23.7925, lng: 90.4078 } },
  { id: 'uttara', name: { en: 'Uttara', bn: 'উত্তরা' }, coords: { lat: 23.8759, lng: 90.3795 } },
];

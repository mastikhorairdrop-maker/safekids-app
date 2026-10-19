import { SafeZone } from "../types/safekids";

/**
 * Calculate Haversine distance in meters between two lat/lon coordinates
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Check which safe zones the current coordinate is currently inside
 */
export function getActiveSafeZones(lat: number, lon: number, zones: SafeZone[]): SafeZone[] {
  return zones.filter((zone) => {
    if (!zone.enabled) return false;
    const distance = calculateDistanceMeters(lat, lon, zone.latitude, zone.longitude);
    return distance <= zone.radiusMeters;
  });
}

/**
 * Format meters to human readable distance
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
}

/**
 * Reverse geocode coordinates using free OpenStreetMap Nominatim with fallback
 */
export async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
      {
        signal: controller.signal,
        headers: {
          "Accept-Language": "en",
          "User-Agent": "SafeKids-Parental-Control-App/1.0",
        },
      },
    );
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data && data.display_name) {
        // Shorten long OSM address
        const parts = data.display_name.split(", ");
        return parts.slice(0, 3).join(", ");
      }
    }
  } catch {
    // network timeout or cors fallback
  }

  return `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`;
}

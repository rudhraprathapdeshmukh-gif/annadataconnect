/**
 * Calculate distance between two coordinates using Haversine formula
 * @param lat1 Latitude of point 1
 * @param lon1 Longitude of point 1
 * @param lat2 Latitude of point 2
 * @param lon2 Longitude of point 2
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Reverse geocode coordinates to get district/city name using Nominatim API
 * @param lat Latitude
 * @param lng Longitude
 * @returns District or city name, or null if not found
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en',
        },
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    const address = data?.address;
    if (!address) return null;

    // Try state_district first, then city, then town, then county
    return address.state_district || address.city || address.town || address.county || null;
  } catch {
    return null;
  }
}

/**
 * Check if user is within geofence radius of a location
 * @param userLat User's current latitude
 * @param userLon User's current longitude
 * @param targetLat Target location latitude
 * @param targetLon Target location longitude
 * @param radiusKm Geofence radius in kilometers (default: 0.2km = 200m)
 * @returns True if user is within geofence
 */
export function isWithinGeofence(
  userLat: number,
  userLon: number,
  targetLat: number,
  targetLon: number,
  radiusKm: number = 0.2
): boolean {
  const distance = calculateDistance(userLat, userLon, targetLat, targetLon);
  return distance <= radiusKm;
}

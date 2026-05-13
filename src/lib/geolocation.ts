export interface GeoPoint {
  lat: number
  lng: number
}

export interface GeoPosition extends GeoPoint {
  accuracy: number
}

export interface TourVisit {
  id: string
  label: string
  address: string | null
  city: string | null
  lat: number | null
  lng: number | null
}

export interface OptimizedTour {
  route: TourVisit[]
  totalDistanceKm: number
  estimatedDurationMinutes: number
}

export function getCurrentPosition(): Promise<GeoPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Geolocalisation indisponible sur cet appareil.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        }),
      (error) => reject(new Error(error.message || 'Permission geolocalisation refusee.')),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  })
}

export function calculateDistance(p1: GeoPoint, p2: GeoPoint): number {
  const radiusKm = 6371
  const dLat = toRadians(p2.lat - p1.lat)
  const dLng = toRadians(p2.lng - p1.lng)
  const lat1 = toRadians(p1.lat)
  const lat2 = toRadians(p2.lat)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  return radiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function optimizeTour(visits: TourVisit[], startPoint?: GeoPoint): OptimizedTour {
  const withCoords = visits.filter((visit) => typeof visit.lat === 'number' && typeof visit.lng === 'number')
  const withoutCoords = visits.filter((visit) => typeof visit.lat !== 'number' || typeof visit.lng !== 'number')
  if (withCoords.length === 0) return { route: visits, totalDistanceKm: 0, estimatedDurationMinutes: visits.length * 60 }

  let current: GeoPoint = startPoint ?? { lat: withCoords[0].lat as number, lng: withCoords[0].lng as number }
  const unvisited = [...withCoords]
  const route: TourVisit[] = []
  let totalDistanceKm = 0

  while (unvisited.length > 0) {
    let nearestIndex = 0
    let nearestDistance = Number.POSITIVE_INFINITY
    unvisited.forEach((visit, index) => {
      const distance = calculateDistance(current, { lat: visit.lat as number, lng: visit.lng as number })
      if (distance < nearestDistance) {
        nearestDistance = distance
        nearestIndex = index
      }
    })
    const [nearest] = unvisited.splice(nearestIndex, 1)
    route.push(nearest)
    totalDistanceKm += Number.isFinite(nearestDistance) ? nearestDistance : 0
    current = { lat: nearest.lat as number, lng: nearest.lng as number }
  }

  return {
    route: [...route, ...withoutCoords],
    totalDistanceKm,
    estimatedDurationMinutes: Math.round(totalDistanceKm * 1.5 + visits.length * 60),
  }
}

export function getDirectionsURL(visits: TourVisit[]): string {
  const waypoints = visits
    .map((visit) => {
      if (visit.lat && visit.lng) return `${visit.lat},${visit.lng}`
      return [visit.address, visit.city].filter(Boolean).join(' ')
    })
    .filter(Boolean)
  const destination = waypoints.at(-1) ?? ''
  const middle = waypoints.slice(0, -1).join('|')
  const params = new URLSearchParams({ destination, travelmode: 'driving' })
  if (middle) params.set('waypoints', middle)
  return `https://www.google.com/maps/dir/?api=1&${params.toString()}`
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180
}

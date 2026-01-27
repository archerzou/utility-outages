export interface LocationGeometry {
  type: 'Point' | 'Polygon'
  coordinates: [number, number] | [number, number][][] // Point: [lng, lat] | Polygon: array of rings
}

export interface RescheduleHistory {
  original_start_time: string
  new_start_time: string
  reason: string
}

export interface Outage {
  id: string
  provider: string
  category: string
  status: 'active' | 'restored' | 'cancelled' | 'postponed' | 'scheduled'
  schedule_type: 'planned' | 'unplanned'
  start_time: string // ISO datetime with timezone
  end_time: string | null // ISO datetime with timezone or null
  last_updated: string
  fetched_at: string
  cause: string
  location_description: string
  location_geometry: LocationGeometry
  region: string
  affected_customers: number | null
  information_url: string
  comments: string
  latest_update: string
  reschedule_history: RescheduleHistory[]
}

export interface OutageData {
  id: string
  title: string
  description: string
  latitude: number
  longitude: number
  severity: 'low' | 'medium' | 'high'
  status: 'active' | 'resolved' | 'investigating'
  affectedCustomers: number
  estimatedRestoration?: Date
  createdAt: Date
  updatedAt?: Date
  outageType?: 'power' | 'water' | 'gas' | 'internet' | 'other'
  provider?: string
  region?: string
}

export interface OutageStats {
  total: number
  active: number
  resolved: number
  investigating: number
  affectedCustomers: number
}

export interface OutageFilters {
  severity?: string[]
  status?: string[]
  outageType?: string[]
  region?: string[]
  dateRange?: {
    start: Date
    end: Date
  }
}

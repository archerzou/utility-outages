export interface RoadLocationGeometry {
  type: 'Point' | 'MultiLineString'
  coordinates: [number, number] | [number, number][][] // Point: [lng, lat] | MultiLineString: array of line arrays
}

export interface RoadClosure {
  id: string
  provider: string
  category: string
  status: 'active' | 'restored' | 'cancelled' | 'postponed' | 'scheduled'
  event_type: string
  schedule_type: 'planned' | 'unplanned'
  start_time: string
  end_time: string | null
  created_time: string
  last_updated: string
  description: string
  comments: string
  impact: string
  region: string[]
  location_description: string
  location_geometry: RoadLocationGeometry
  detour_description: string
  expected_resolution: string
}

export interface RoadClosureFilters {
  status?: string[]
  impact?: string[]
  region?: string[]
  event_type?: string[]
  dateRange?: {
    start: Date
    end: Date
  }
}

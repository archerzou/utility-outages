/**
 * API Response Types
 * These interfaces define the structure of data returned from the REST API
 */

// Geometry type for API responses
export interface ApiGeometry {
  type: 'Point' | 'Polygon'
  coordinates: [number, number] | [number, number][][]
}

// Single outage from API response
export interface ApiOutage {
  id: string
  provider: string
  type: string
  start_time: string
  end_time: string | null
  fetched_at: string
  last_updated: string | null
  category: string
  status: 'active' | 'restored' | 'cancelled' | 'postponed' | 'scheduled'
  schedule_type: 'planned' | 'unplanned'
  cause: string
  location: string
  region: string
  affected_customers: number | null
  information_url: string
  comments: string | null
  latest_update: string | null
  geometry: ApiGeometry
}

// API response wrapper
export interface ApiOutagesResponse {
  outages: ApiOutage[]
}

// Generic API response wrapper for future endpoints
export interface ApiResponse<T> {
  data: T
  error?: string
  message?: string
}

// Fetch state for tracking loading/error states
export type FetchStatus = 'idle' | 'loading' | 'success' | 'error'

export interface FetchState<T> {
  data: T | null
  status: FetchStatus
  error: string | null
  lastFetched: Date | null
}

// Data source indicator
export type DataSource = 'api' | 'fallback'

export interface FetchResult<T> {
  data: T
  source: DataSource
}

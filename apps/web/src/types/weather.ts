export interface Impact {
  id: number
  hazard_id: number
  impact_type: string
  value: number | null
  unit: string | null
  description: string
}

export interface Hazard {
  id: number
  event_id: number
  region: string
  hazard_type: string
  location_name: string | null
  latitude: number | null
  longitude: number | null
  impacts: Impact[]
}

export interface WeatherEvent {
  id: number
  event_identifier: string
  title: string
  start_date: string
  return_period_category: string | null
  abstract: string
  hazards: Hazard[]
}

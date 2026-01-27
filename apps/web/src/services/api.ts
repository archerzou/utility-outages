/**
 * API Service Layer
 * Provides a robust data fetching layer with API-first strategy and local JSON fallback
 */

import axios, { type AxiosInstance, AxiosError } from 'axios'
import type { ApiOutage, ApiOutagesResponse, FetchResult, DataSource } from '../types/api'
import type { Outage } from '../types/outage'

// Default configuration
const DEFAULT_TIMEOUT = 10000 // 10 seconds
const DEFAULT_RETRY_COUNT = 2
const DEFAULT_RETRY_DELAY = 1000 // 1 second

// Create axios instance with base configuration
const createApiClient = (): AxiosInstance => {
  const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081'
  
  return axios.create({
    baseURL,
    timeout: DEFAULT_TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

// Singleton API client instance
let apiClient: AxiosInstance | null = null

const getApiClient = (): AxiosInstance => {
  if (!apiClient) {
    apiClient = createApiClient()
  }
  return apiClient
}

/**
 * Transform API outage format to local Outage format
 * Handles the differences between API response and local JSON structure
 */
export const transformApiOutage = (apiOutage: ApiOutage): Outage => {
  return {
    id: apiOutage.id,
    provider: apiOutage.provider,
    category: apiOutage.category || apiOutage.type,
    status: apiOutage.status,
    schedule_type: apiOutage.schedule_type,
    start_time: apiOutage.start_time,
    end_time: apiOutage.end_time,
    last_updated: apiOutage.last_updated || '',
    fetched_at: apiOutage.fetched_at,
    cause: apiOutage.cause,
    location_description: apiOutage.location,
    location_geometry: {
      type: apiOutage.geometry.type,
      coordinates: apiOutage.geometry.coordinates,
    },
    region: apiOutage.region,
    affected_customers: apiOutage.affected_customers,
    information_url: apiOutage.information_url,
    comments: apiOutage.comments || '',
    latest_update: apiOutage.latest_update || '',
    reschedule_history: [],
  }
}

/**
 * Transform array of API outages to local format
 */
export const transformApiOutages = (apiOutages: ApiOutage[]): Outage[] => {
  return apiOutages.map(transformApiOutage)
}

/**
 * Sleep utility for retry delays
 */
const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Fetch with retry logic
 */
const fetchWithRetry = async <T>(
  fetchFn: () => Promise<T>,
  retryCount: number = DEFAULT_RETRY_COUNT,
  retryDelay: number = DEFAULT_RETRY_DELAY
): Promise<T> => {
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt <= retryCount; attempt++) {
    try {
      return await fetchFn()
    } catch (error) {
      lastError = error as Error
      
      if (attempt < retryCount) {
        console.warn(`Fetch attempt ${attempt + 1} failed, retrying in ${retryDelay}ms...`)
        await sleep(retryDelay)
      }
    }
  }
  
  throw lastError
}

/**
 * Fetch outages from API
 */
const fetchOutagesFromApi = async (): Promise<Outage[]> => {
  const client = getApiClient()
  const response = await client.get<ApiOutagesResponse>('/api/v1/outages')
  
  if (!response.data || !response.data.outages || response.data.outages.length === 0) {
    throw new Error('Empty or invalid API response')
  }
  
  return transformApiOutages(response.data.outages)
}

/**
 * Fetch outages from local JSON fallback
 */
const fetchOutagesFromFallback = async (): Promise<Outage[]> => {
  const { default: powerOutagesData } = await import('../data/powerOutages.json')
  return powerOutagesData as Outage[]
}

/**
 * Main function to fetch outages with API-first strategy and fallback
 */
export const fetchOutages = async (): Promise<FetchResult<Outage[]>> => {
  let source: DataSource = 'api'
  
  try {
    // Try API first with retry logic
    const data = await fetchWithRetry(fetchOutagesFromApi)
    console.log(`Successfully fetched ${data.length} outages from API`)
    return { data, source }
  } catch (apiError) {
    // Log API error details
    if (apiError instanceof AxiosError) {
      console.warn('API fetch failed:', {
        message: apiError.message,
        status: apiError.response?.status,
        code: apiError.code,
      })
    } else {
      console.warn('API fetch failed:', apiError)
    }
    
    // Fall back to local JSON
    source = 'fallback'
    console.log('Falling back to local JSON data...')
    
    try {
      const data = await fetchOutagesFromFallback()
      console.log(`Successfully loaded ${data.length} outages from local fallback`)
      return { data, source }
    } catch (fallbackError) {
      console.error('Fallback fetch also failed:', fallbackError)
      throw new Error('Failed to fetch outages from both API and fallback')
    }
  }
}

/**
 * Generic fetch function for future extensibility
 * Can be used for road closures, weather hazards, etc.
 */
export interface FetchConfig<TApi, TLocal> {
  endpoint: string
  transformFn: (apiData: TApi) => TLocal
  fallbackFn: () => Promise<TLocal>
  extractData?: (response: unknown) => TApi
}

export const createFetcher = <TApi, TLocal>(config: FetchConfig<TApi, TLocal>) => {
  return async (): Promise<FetchResult<TLocal>> => {
    let source: DataSource = 'api'
    
    try {
      const client = getApiClient()
      const response = await fetchWithRetry(() => client.get(config.endpoint))
      
      const apiData = config.extractData 
        ? config.extractData(response.data) 
        : response.data as TApi
      
      const data = config.transformFn(apiData)
      return { data, source }
    } catch (apiError) {
      console.warn(`API fetch failed for ${config.endpoint}:`, apiError)
      source = 'fallback'
      
      try {
        const data = await config.fallbackFn()
        return { data, source }
      } catch (fallbackError) {
        console.error('Fallback fetch also failed:', fallbackError)
        throw new Error(`Failed to fetch data from both API and fallback for ${config.endpoint}`)
      }
    }
  }
}

// Export the API client for advanced use cases
export { getApiClient }

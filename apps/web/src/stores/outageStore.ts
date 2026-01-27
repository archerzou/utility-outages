/**
 * Outage Store using Zustand
 * Manages outage data state with loading, error handling, and caching
 */

import { create } from 'zustand'
import type { Outage } from '../types/outage'
import type { FetchStatus, DataSource } from '../types/api'
import { fetchOutages } from '../services/api'

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000

interface OutageState {
  // Data
  outages: Outage[]
  
  // Fetch state
  status: FetchStatus
  error: string | null
  dataSource: DataSource | null
  lastFetched: Date | null
  
  // Actions
  fetchOutages: () => Promise<void>
  refetch: () => Promise<void>
  clearError: () => void
  reset: () => void
}

const initialState = {
  outages: [],
  status: 'idle' as FetchStatus,
  error: null,
  dataSource: null,
  lastFetched: null,
}

export const useOutageStore = create<OutageState>((set, get) => ({
  ...initialState,
  
  fetchOutages: async () => {
    const state = get()
    
    // Check if we have cached data that's still fresh
    if (
      state.status === 'success' &&
      state.lastFetched &&
      Date.now() - state.lastFetched.getTime() < CACHE_DURATION
    ) {
      console.log('Using cached outage data')
      return
    }
    
    // Don't fetch if already loading
    if (state.status === 'loading') {
      return
    }
    
    set({ status: 'loading', error: null })
    
    try {
      const result = await fetchOutages()
      set({
        outages: result.data,
        status: 'success',
        error: null,
        dataSource: result.source,
        lastFetched: new Date(),
      })
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred while fetching outages'
      
      set({
        status: 'error',
        error: errorMessage,
      })
    }
  },
  
  refetch: async () => {
    // Force refetch by clearing cache timestamp
    set({ lastFetched: null })
    await get().fetchOutages()
  },
  
  clearError: () => {
    set({ error: null })
  },
  
  reset: () => {
    set(initialState)
  },
}))

// Selectors for derived state
export const selectOutages = (state: OutageState) => state.outages
export const selectIsLoading = (state: OutageState) => state.status === 'loading'
export const selectError = (state: OutageState) => state.error
export const selectDataSource = (state: OutageState) => state.dataSource
export const selectStatus = (state: OutageState) => state.status

// Selector for filtered outages by status
export const selectOutagesByStatus = (status: string) => (state: OutageState) => {
  if (status === 'all') return state.outages
  return state.outages.filter(outage => outage.status === status)
}

// Selector for outage statistics
export const selectOutageStats = (state: OutageState) => {
  const outages = state.outages
  return {
    total: outages.length,
    active: outages.filter(o => o.status === 'active').length,
    restored: outages.filter(o => o.status === 'restored').length,
    cancelled: outages.filter(o => o.status === 'cancelled').length,
    postponed: outages.filter(o => o.status === 'postponed').length,
    scheduled: outages.filter(o => o.status === 'scheduled').length,
    affectedCustomers: outages.reduce((sum, o) => sum + (o.affected_customers || 0), 0),
  }
}

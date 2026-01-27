/**
 * useOutages Hook
 * Provides a convenient interface to the outage store
 * Maintains backward compatibility with existing components
 */

import { useEffect } from 'react'
import { useOutageStore, selectOutageStats } from '../stores/outageStore'
import type { Outage } from '../types/outage'

export const useOutages = () => {
  const {
    outages,
    status,
    error,
    dataSource,
    fetchOutages,
    refetch,
    clearError,
  } = useOutageStore()

  // Fetch outages on mount
  useEffect(() => {
    fetchOutages()
  }, [fetchOutages])

  const loading = status === 'loading'
  const isIdle = status === 'idle'
  const isSuccess = status === 'success'
  const isError = status === 'error'

  // Filter outages by various criteria
  const filterOutages = (filters: {
    status?: string
    searchTerm?: string
    region?: string
  }): Outage[] => {
    let filtered = outages

    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(outage => outage.status === filters.status)
    }

    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase()
      filtered = filtered.filter(outage =>
        outage.location_description.toLowerCase().includes(term) ||
        outage.provider.toLowerCase().includes(term) ||
        outage.region.toLowerCase().includes(term)
      )
    }

    if (filters.region) {
      filtered = filtered.filter(outage => outage.region === filters.region)
    }

    return filtered
  }

  // Get outage statistics
  const getOutageStats = () => {
    return selectOutageStats(useOutageStore.getState())
  }

  return {
    outages,
    loading,
    error,
    dataSource,
    isIdle,
    isSuccess,
    isError,
    fetchOutages,
    refetch,
    clearError,
    filterOutages,
    getOutageStats,
  }
}

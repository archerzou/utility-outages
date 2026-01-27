import { useState, useEffect, useMemo } from 'react'
import type { RoadClosure, RoadClosureFilters } from '../types/road'
import roadClosuresDataJson from '../data/roadClosures.json'

const roadClosuresData = roadClosuresDataJson as RoadClosure[]

export const useRoads = () => {
  const [roadClosures, setRoadClosures] = useState<RoadClosure[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRoadClosures = async () => {
    try {
      setLoading(true)
      setError(null)
      setRoadClosures(roadClosuresData)
    } catch (err) {
      setError('Failed to fetch road closures')
      console.error('Error fetching road closures:', err)
    } finally {
      setLoading(false)
    }
  }

  const filterRoadClosures = (filters: RoadClosureFilters) => {
    return roadClosures.filter(closure => {
      if (filters.status && !filters.status.includes(closure.status)) {
        return false
      }
      if (filters.impact && !filters.impact.includes(closure.impact)) {
        return false
      }
      if (filters.event_type && !filters.event_type.includes(closure.event_type)) {
        return false
      }
      if (filters.region && filters.region.length > 0) {
        const hasMatchingRegion = closure.region.some(r => 
          filters.region?.includes(r)
        )
        if (!hasMatchingRegion) {
          return false
        }
      }
      if (filters.dateRange) {
        const closureDate = new Date(closure.start_time)
        if (closureDate < filters.dateRange.start || closureDate > filters.dateRange.end) {
          return false
        }
      }
      return true
    })
  }

  const getRoadClosureStats = useMemo(() => {
    const total = roadClosures.length
    const active = roadClosures.filter(c => c.status === 'active').length
    const scheduled = roadClosures.filter(c => c.status === 'scheduled').length
    const cancelled = roadClosures.filter(c => c.status === 'cancelled').length

    const impactCounts = roadClosures.reduce((acc, closure) => {
      acc[closure.impact] = (acc[closure.impact] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      total,
      active,
      scheduled,
      cancelled,
      impactCounts,
    }
  }, [roadClosures])

  useEffect(() => {
    fetchRoadClosures()
  }, [])

  return {
    roadClosures,
    loading,
    error,
    fetchRoadClosures,
    filterRoadClosures,
    getRoadClosureStats,
  }
}

import { useMemo } from 'react'
import { useDebouncedValue } from '@mantine/hooks'
import type { WeatherEvent, Hazard } from '../types/weather'

interface UseHazardsProps {
  weatherEvents: WeatherEvent[]
  searchTerm: string
  hazardTypeFilter: string
}

interface UseHazardsReturn {
  filteredEvents: WeatherEvent[]
  allHazards: Hazard[]
  filteredHazards: Hazard[]
  hazardTypes: string[]
}

export const useHazards = ({ 
  weatherEvents, 
  searchTerm, 
  hazardTypeFilter 
}: UseHazardsProps): UseHazardsReturn => {
  const [debouncedSearch] = useDebouncedValue(searchTerm, 300)

  const allHazards = useMemo(() => {
    return weatherEvents.flatMap(event => 
      event.hazards.map(hazard => ({
        ...hazard,
        event: event
      }))
    )
  }, [weatherEvents])

  const hazardTypes = useMemo(() => {
    const types = new Set<string>()
    allHazards.forEach(hazard => {
      if (hazard.hazard_type) {
        types.add(hazard.hazard_type)
      }
    })
    return Array.from(types).sort()
  }, [allHazards])

  const filteredEvents = useMemo(() => {
    const term = debouncedSearch.toLowerCase().trim()
    
    return weatherEvents.filter(event => {
      const matchesSearch = term === '' || 
        event.title.toLowerCase().includes(term)
      
      const matchesHazardType = hazardTypeFilter === 'all' || 
        event.hazards.some(hazard => hazard.hazard_type === hazardTypeFilter)
      
      return matchesSearch && matchesHazardType
    })
  }, [weatherEvents, debouncedSearch, hazardTypeFilter])

  const filteredHazards = useMemo(() => {
    return filteredEvents.flatMap(event => 
      event.hazards.filter(hazard => {
        const matchesHazardType = hazardTypeFilter === 'all' || 
          hazard.hazard_type === hazardTypeFilter
        
        return matchesHazardType && hazard.latitude !== null && hazard.longitude !== null
      })
    )
  }, [filteredEvents, hazardTypeFilter])

  return {
    filteredEvents,
    allHazards,
    filteredHazards,
    hazardTypes
  }
}

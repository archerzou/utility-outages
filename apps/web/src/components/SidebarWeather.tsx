import { Card, Text, Badge, Group, Select, TextInput, Skeleton, ActionIcon, Button, Stack } from '@mantine/core'
import { IconSearch, IconAlertCircle, IconX, IconFilter } from '@tabler/icons-react'
import { useState } from 'react'
import weatherEventsDataJson from '../data/historicWeatherHazards.json'
import type { WeatherEvent } from '../types/weather'
import SidebarLayout from './shared/SidebarLayout'
import { useHazards } from '../hooks/useHazards'

const weatherEventsData = weatherEventsDataJson as WeatherEvent[]

interface SidebarWeatherProps {
  eventTypeName: string
  onBack: () => void
  onEventSelect?: (eventId: number) => void
  onShowAllHazards?: () => void
  selectedEventId?: number | null
}

const SidebarWeather = ({ eventTypeName, onBack, onEventSelect, onShowAllHazards, selectedEventId }: SidebarWeatherProps) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [hazardTypeFilter, setHazardTypeFilter] = useState<string>('all')
  const [isLoading] = useState(false)

  const { filteredEvents, hazardTypes } = useHazards({
    weatherEvents: weatherEventsData,
    searchTerm,
    hazardTypeFilter
  })

  const eventsToShow = filteredEvents.slice(0, 8)

  const hazardTypeOptions = [
    { value: 'all', label: 'All Hazard Types' },
    ...hazardTypes.map(type => ({ value: type, label: type }))
  ]

  return (
    <SidebarLayout eventTypeName={eventTypeName} onBack={onBack}>
      <Card withBorder>
        <Stack gap="sm">
          <Group justify="space-between" align="center">
            <Text size="sm" fw={600}>
              All Historic Events ({weatherEventsData.length})
            </Text>
            <Button 
              variant="subtle" 
              size="xs" 
              c="#00bcd4"
              onClick={onShowAllHazards}
            >
              [View All Events]
            </Button>
          </Group>
        </Stack>
      </Card>

      <Card withBorder>
        <Stack gap="sm">
          <Text size="sm" fw={600}>Search & Filter</Text>

          <TextInput
            placeholder="Search by title..."
            leftSection={<IconSearch size={16} />}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.currentTarget.value)}
            rightSection={
              searchTerm ? (
                <ActionIcon
                  size="sm"
                  variant="subtle"
                  aria-label="Clear search"
                  onClick={() => setSearchTerm('')}
                >
                  <IconX size={14} />
                </ActionIcon>
              ) : null
            }
            rightSectionPointerEvents="auto"
          />

          <Select
            placeholder="Filter by Hazard Type"
            leftSection={<IconFilter size={16} />}
            data={hazardTypeOptions}
            value={hazardTypeFilter}
            onChange={(value) => setHazardTypeFilter(value || 'all')}
            comboboxProps={{ withinPortal: true, zIndex: 5000 }}
          />
        </Stack>
      </Card>

      <Card withBorder>
        <Stack gap="sm">
          <Text size="sm" fw={600}>Historic Events</Text>

          {isLoading ? (
            <Stack gap="md">
              {Array(3).fill(0).map((_, i) => (
                <Skeleton key={i} height={80} radius="md" />
              ))}
            </Stack>
          ) : filteredEvents.length === 0 ? (
            <Stack align="center" gap="md" py="xl">
              <IconAlertCircle size={48} color="gray" />
              <Text size="lg" fw={500}>No events found</Text>
              <Text size="sm" c="dimmed" ta="center">
                Try adjusting your search or filters
              </Text>
            </Stack>
          ) : (
            <>
              {eventsToShow.map((event) => {
                const hazardCount = event.hazards.filter(h => h.latitude !== null && h.longitude !== null).length
                const isSelected = event.id === selectedEventId
                
                return (
                  <Card 
                    key={event.id} 
                    withBorder 
                    radius="sm" 
                    p="sm"
                    style={{ 
                      cursor: 'pointer',
                      borderColor: isSelected ? '#00bcd4' : undefined,
                      borderWidth: isSelected ? '2px' : undefined,
                    }}
                    onClick={() => onEventSelect?.(event.id)}
                  >
                    <Stack gap="xs">
                      <Group justify="space-between" align="flex-start">
                        <Text size="xs" fw={500} lineClamp={2} style={{ flex: 1 }}>
                          {event.title}
                        </Text>
                        <Badge size="sm" color="orange" variant="light">
                          {hazardCount}
                        </Badge>
                      </Group>
                      
                      <Text size="xs" c="dimmed">
                        Start Date: {event.start_date}
                      </Text>
                    </Stack>
                  </Card>
                )
              })}
            </>
          )}
        </Stack>
      </Card>
    </SidebarLayout>
  )
}

export default SidebarWeather

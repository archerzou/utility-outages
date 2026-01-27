import { Card, Text, Badge, Group, Select, TextInput, Skeleton, ActionIcon, Button, Stack } from '@mantine/core'
import { IconSearch, IconAlertCircle, IconChevronRight, IconX, IconFilter } from '@tabler/icons-react'
import { useState, useMemo } from 'react'
import { useDebouncedValue } from '@mantine/hooks'
import roadClosuresDataJson from '../data/roadClosures.json'
import type { RoadClosure } from '../types/road'
import SidebarLayout from './shared/SidebarLayout'

const roadClosuresData = roadClosuresDataJson as RoadClosure[]

interface SidebarRoadProps {
  eventTypeName: string
  onBack: () => void
  onRoadSelect?: (roadId: string) => void
  selectedRoadId?: string | null
}

const SidebarRoad = ({ eventTypeName, onBack, onRoadSelect, selectedRoadId }: SidebarRoadProps) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isLoading] = useState(false)

  const [debouncedSearch] = useDebouncedValue(searchTerm, 300)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'red'
      case 'restored':
        return 'green'
      case 'cancelled':
        return 'gray'
      case 'postponed':
        return 'yellow'
      case 'scheduled':
        return 'blue'
      default:
        return 'gray'
    }
  }

  const getImpactColor = (impact: string) => {
    switch (impact.toLowerCase()) {
      case 'road closed':
        return 'red'
      case 'caution':
        return 'yellow'
      case 'delays':
        return 'orange'
      default:
        return 'gray'
    }
  }

  const displayRoadClosures = useMemo(() => {
    const term = debouncedSearch.toLowerCase().trim()
    return roadClosuresData.filter(closure => {
      const matchesSearch = term === '' || 
        closure.location_description.toLowerCase().includes(term)
      
      const matchesStatus = statusFilter === 'all' || 
        closure.status === statusFilter
      
      return matchesSearch && matchesStatus
    })
  }, [debouncedSearch, statusFilter])

  const closuresToShow = displayRoadClosures.slice(0, 8)

  return (
    <SidebarLayout eventTypeName={eventTypeName} onBack={onBack}>
      <Card withBorder>
        <Stack gap="sm">
          <Text size="sm" fw={600}>Search & Filter</Text>

          <TextInput
            placeholder="Search by location..."
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
            placeholder="Filter by Status"
            leftSection={<IconFilter size={16} />}
            data={[
              { value: 'all', label: 'All Statuses' },
              { value: 'active', label: 'Active' },
              { value: 'restored', label: 'Restored' },
              { value: 'cancelled', label: 'Cancelled' },
              { value: 'postponed', label: 'Postponed' },
              { value: 'scheduled', label: 'Scheduled' },
            ]}
            value={statusFilter}
            onChange={(value) => setStatusFilter(value || 'all')}
            comboboxProps={{ withinPortal: true, zIndex: 5000 }}
          />
        </Stack>
      </Card>

      <Card withBorder>
        <Stack gap="sm">
          <Text size="sm" fw={600}>Road Closures</Text>

          {isLoading ? (
            <Stack gap="md">
              {Array(3).fill(0).map((_, i) => (
                <Skeleton key={i} height={120} radius="md" />
              ))}
            </Stack>
          ) : displayRoadClosures.length === 0 ? (
            <Stack align="center" gap="md" py="xl">
              <IconAlertCircle size={48} color="gray" />
              <Text size="lg" fw={500}>No road closures found</Text>
              <Text size="sm" c="dimmed" ta="center">
                Try adjusting your search or filters
              </Text>
            </Stack>
          ) : (
            <>
              {closuresToShow.map((closure) => {
                const isSelected = closure.id === selectedRoadId
                
                return (
                  <Card 
                    key={closure.id} 
                    withBorder 
                    radius="sm" 
                    p="sm"
                    style={{ 
                      cursor: 'pointer',
                      borderColor: isSelected ? '#00bcd4' : undefined,
                      borderWidth: isSelected ? '2px' : undefined,
                    }}
                    onClick={() => onRoadSelect?.(closure.id)}
                  >
                  <Stack gap="xs">
                    <Group justify="space-between" align="flex-start">
                      <Text size="xs" fw={500} lineClamp={2} style={{ flex: 1 }}>
                        {closure.location_description}
                      </Text>
                      <Badge size="xs" color={getStatusColor(closure.status)}>
                        {closure.status}
                      </Badge>
                    </Group>
                    
                    <Group gap="xs">
                      <Badge size="xs" variant="light" color={getImpactColor(closure.impact)}>
                        {closure.impact}
                      </Badge>
                    </Group>

                    <Text size="xs" c="dimmed">
                      Provider: {closure.provider.toUpperCase()}
                    </Text>
                  </Stack>
                </Card>
                )
              })}
              
              <Button 
                variant="outline" 
                fullWidth 
                mt="md"
                rightSection={<IconChevronRight size={16} />}
              >
                View All Events
              </Button>
            </>
          )}
        </Stack>
      </Card>
    </SidebarLayout>
  )
}

export default SidebarRoad

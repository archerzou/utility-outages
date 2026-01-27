import { Card, Text, Badge, Group, Select, TextInput, Skeleton, ActionIcon, Button, Stack, Alert } from '@mantine/core'
import { IconSearch, IconAlertCircle, IconChevronRight, IconX, IconFilter, IconRefresh } from '@tabler/icons-react'
import { useState, useMemo } from 'react'
import { useDebouncedValue } from '@mantine/hooks'
import { useOutageStore } from '../stores/outageStore'
import SidebarLayout from './shared/SidebarLayout'

interface SidebarOutagesProps {
  eventTypeName: string
  onBack: () => void
  onOutageSelect?: (outageId: string) => void
  selectedOutageId?: string | null
}

const SidebarOutages = ({ eventTypeName, onBack, onOutageSelect, selectedOutageId }: SidebarOutagesProps) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const [debouncedSearch] = useDebouncedValue(searchTerm, 300)

  // Use the outage store
  const { outages, status, error, refetch, dataSource } = useOutageStore()
  const isLoading = status === 'loading'

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

  const displayOutages = useMemo(() => {
    const term = debouncedSearch.toLowerCase().trim()
    return outages.filter(outage => {
      const matchesSearch = term === '' || 
        outage.location_description.toLowerCase().includes(term)
      
      const matchesStatus = statusFilter === 'all' || 
        outage.status === statusFilter
      
      return matchesSearch && matchesStatus
    })
  }, [debouncedSearch, statusFilter, outages])

  const outagesToShow = displayOutages.slice(0, 8)

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
              { value: 'scheduled', label: 'Scheduled' },
            ]}
            value={statusFilter}
            onChange={(value) => setStatusFilter(value || 'all')}
            comboboxProps={{ withinPortal: true, zIndex: 5000 }}
          />
        </Stack>
      </Card>

      {error && (
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="Error loading outages"
          color="red"
          variant="light"
        >
          <Stack gap="xs">
            <Text size="sm">{error}</Text>
            <Button
              variant="light"
              color="red"
              size="xs"
              leftSection={<IconRefresh size={14} />}
              onClick={refetch}
            >
              Try Again
            </Button>
          </Stack>
        </Alert>
      )}

      {dataSource === 'fallback' && !error && (
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="Using cached data"
          color="yellow"
          variant="light"
        >
          <Text size="sm">Unable to connect to API. Showing cached data.</Text>
        </Alert>
      )}

      <Card withBorder>
        <Stack gap="sm">
          <Text size="sm" fw={600}>Recent Outages</Text>

          {isLoading ? (
            <Stack gap="md">
              {Array(3).fill(0).map((_, i) => (
                <Skeleton key={i} height={120} radius="md" />
              ))}
            </Stack>
          ) : displayOutages.length === 0 ? (
            <Stack align="center" gap="md" py="xl">
              <IconAlertCircle size={48} color="gray" />
              <Text size="lg" fw={500}>No outages found</Text>
              <Text size="sm" c="dimmed" ta="center">
                Try adjusting your search or filters
              </Text>
            </Stack>
          ) : (
            <>
              {outagesToShow.map((outage) => {
                const isSelected = outage.id === selectedOutageId
                
                return (
                  <Card 
                    key={outage.id} 
                    withBorder 
                    radius="sm" 
                    p="sm"
                    style={{ 
                      cursor: 'pointer',
                      borderColor: isSelected ? '#00bcd4' : undefined,
                      borderWidth: isSelected ? '2px' : undefined,
                    }}
                    onClick={() => onOutageSelect?.(outage.id)}
                  >
                  <Stack gap="xs">
                    <Group justify="space-between" align="flex-start">
                      <Text size="xs" fw={500} lineClamp={1} style={{ flex: 1 }}>
                        {outage.location_description}
                      </Text>
                      <Badge size="xs" color={getStatusColor(outage.status)}>
                        {outage.status}
                      </Badge>
                    </Group>
                    
                    <Text size="xs" c="dimmed">
                      Provider: {outage.provider.toUpperCase()}
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

export default SidebarOutages

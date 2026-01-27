import { useState, useMemo } from 'react'
import {
  Container,
  Tabs,
  TextInput,
  Button,
  Badge,
  Group,
  Text,
  Card,
  SimpleGrid,
  Pagination,
  Modal,
  Checkbox,
  Stack,
  Box,
  Flex,
  CloseButton,
  rem,
} from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { useDisclosure } from '@mantine/hooks'
import {
  IconSearch,
  IconFilter,
  IconBolt,
  IconRoad,
  IconSchool,
  IconDroplet,
  IconCloudStorm,
  IconMapPin,
  IconCalendar,
} from '@tabler/icons-react'

import powerOutagesData from '../data/powerOutages.json'
import roadClosuresData from '../data/roadClosures.json'
import schoolClosuresData from '../data/schoolClosures.json'
import boilWaterNoticesData from '../data/boilWaterNotices.json'
import weatherHazardsData from '../data/historicWeatherHazards.json'

type EventStatus = 'active' | 'scheduled' | 'resolved' | 'restored' | 'cancelled' | 'postponed'

interface BaseEvent {
  id: string
  title: string
  category: string
  status: EventStatus
  startDate: string
  endDate: string | null
  location: string
  description: string
}

interface PowerOutageEvent extends BaseEvent {
  type: 'powerOutages'
  provider: string
  affectedCustomers: number | null
}

interface RoadClosureEvent extends BaseEvent {
  type: 'roadClosures'
  impact: string
}

interface SchoolClosureEvent extends BaseEvent {
  type: 'schoolClosures'
  schoolName: string
}

interface BoilWaterEvent extends BaseEvent {
  type: 'boilWaterNotices'
  provider: string
  affectedProperties: number
}

interface WeatherHazardEvent extends BaseEvent {
  type: 'weatherHazards'
  hazardType: string
  region: string
}

type EventItem = PowerOutageEvent | RoadClosureEvent | SchoolClosureEvent | BoilWaterEvent | WeatherHazardEvent

type TabValue = 'powerOutages' | 'roadClosures' | 'schoolClosures' | 'boilWaterNotices' | 'weatherHazards'

const TAB_CONFIG: Record<TabValue, { label: string; icon: typeof IconBolt; color: string; categories: string[] }> = {
  powerOutages: {
    label: 'Power Outages',
    icon: IconBolt,
    color: '#ff9500',
    categories: ['Maintenance', 'Fault', 'Storm Damage', 'Emergency'],
  },
  roadClosures: {
    label: 'Road Closures',
    icon: IconRoad,
    color: '#868e96',
    categories: ['Roadworks', 'Event', 'Emergency', 'Flooding'],
  },
  schoolClosures: {
    label: 'School Closures',
    icon: IconSchool,
    color: '#868e96',
    categories: ['Weather', 'Emergency', 'Holiday', 'Staff Day'],
  },
  boilWaterNotices: {
    label: 'Boil Water Notices',
    icon: IconDroplet,
    color: '#868e96',
    categories: ['Contamination', 'Maintenance', 'Infrastructure'],
  },
  weatherHazards: {
    label: 'Historic Weather Hazards',
    icon: IconCloudStorm,
    color: '#868e96',
    categories: ['Storm', 'Flood', 'High Wind', 'Snow', 'Fog'],
  },
}

const STATUS_COLORS: Record<string, { color: string; bgColor: string }> = {
  active: { color: '#fa5252', bgColor: '#fff5f5' },
  scheduled: { color: '#228be6', bgColor: '#e7f5ff' },
  resolved: { color: '#37b24d', bgColor: '#ebfbee' },
  restored: { color: '#37b24d', bgColor: '#ebfbee' },
  cancelled: { color: '#868e96', bgColor: '#f8f9fa' },
  postponed: { color: '#fd7e14', bgColor: '#fff4e6' },
}

const CATEGORY_COLORS: Record<string, string> = {
  Maintenance: '#ff9500',
  Fault: '#fa5252',
  'Storm Damage': '#7950f2',
  Emergency: '#e64980',
  Roadworks: '#228be6',
  Event: '#20c997',
  Flooding: '#339af0',
  Weather: '#7950f2',
  Holiday: '#20c997',
  'Staff Day': '#fd7e14',
  Contamination: '#fa5252',
  Infrastructure: '#228be6',
  Storm: '#7950f2',
  Flood: '#339af0',
  'High Wind': '#fd7e14',
  Snow: '#74c0fc',
  Fog: '#868e96',
}

const ITEMS_PER_PAGE = 12

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-NZ', { day: '2-digit', month: 'short', year: 'numeric' })
}

const formatDateRange = (startDate: string, endDate: string | null): string => {
  const start = formatDate(startDate)
  if (!endDate) return start
  const end = formatDate(endDate)
  if (start === end) return start
  return `${start} - ${end}`
}

const normalizeStatus = (status: string): EventStatus => {
  const statusMap: Record<string, EventStatus> = {
    active: 'active',
    scheduled: 'scheduled',
    resolved: 'resolved',
    restored: 'resolved',
    cancelled: 'cancelled',
    postponed: 'scheduled',
  }
  return statusMap[status.toLowerCase()] || 'active'
}

const getDisplayStatus = (status: EventStatus): string => {
  const displayMap: Record<EventStatus, string> = {
    active: 'Active',
    scheduled: 'Scheduled',
    resolved: 'Resolved',
    restored: 'Resolved',
    cancelled: 'Cancelled',
    postponed: 'Scheduled',
  }
  return displayMap[status] || status
}

const transformPowerOutages = (): PowerOutageEvent[] => {
  return (powerOutagesData as Array<{
    id: string
    provider: string
    category: string
    status: string
    start_time: string
    end_time: string | null
    location_description: string
    cause: string
    affected_customers: number | null
  }>).map((item) => ({
    id: item.id,
    title: item.cause || `Power Outage - ${item.location_description.split(':')[0]}`,
    category: mapPowerOutageCategory(item.cause),
    status: normalizeStatus(item.status),
    startDate: item.start_time,
    endDate: item.end_time,
    location: item.location_description,
    description: `${item.cause}. ${item.affected_customers ? `Affecting approximately ${item.affected_customers} customers.` : ''}`,
    type: 'powerOutages',
    provider: item.provider,
    affectedCustomers: item.affected_customers,
  }))
}

const mapPowerOutageCategory = (cause: string): string => {
  const causeLower = cause.toLowerCase()
  if (causeLower.includes('maintenance') || causeLower.includes('planned')) return 'Maintenance'
  if (causeLower.includes('storm') || causeLower.includes('weather') || causeLower.includes('tree')) return 'Storm Damage'
  if (causeLower.includes('emergency') || causeLower.includes('vehicle')) return 'Emergency'
  return 'Fault'
}

const transformRoadClosures = (): RoadClosureEvent[] => {
  return (roadClosuresData as Array<{
    id: string
    description: string
    status: string
    start_time: string
    end_time: string | null
    location_description: string
    comments: string
    impact: string
    event_type: string
  }>).map((item) => ({
    id: item.id,
    title: `${item.description} - ${item.location_description.split(',')[0]}`,
    category: mapRoadClosureCategory(item.event_type, item.description),
    status: normalizeStatus(item.status),
    startDate: item.start_time,
    endDate: item.end_time,
    location: item.location_description,
    description: item.comments || item.description,
    type: 'roadClosures',
    impact: item.impact,
  }))
}

const mapRoadClosureCategory = (eventType: string, description: string): string => {
  const combined = `${eventType} ${description}`.toLowerCase()
  if (combined.includes('flood')) return 'Flooding'
  if (combined.includes('emergency') || combined.includes('crash')) return 'Emergency'
  if (combined.includes('event')) return 'Event'
  return 'Roadworks'
}

const transformSchoolClosures = (): SchoolClosureEvent[] => {
  return (schoolClosuresData as Array<{
    id: string
    title: string
    category: string
    status: string
    startDate: string
    endDate: string | null
    location: string
    description: string
    schoolName: string
  }>).map((item) => ({
    id: item.id,
    title: item.title,
    category: item.category,
    status: normalizeStatus(item.status),
    startDate: item.startDate,
    endDate: item.endDate,
    location: item.location,
    description: item.description,
    type: 'schoolClosures',
    schoolName: item.schoolName,
  }))
}

const transformBoilWaterNotices = (): BoilWaterEvent[] => {
  return (boilWaterNoticesData as Array<{
    id: string
    title: string
    category: string
    status: string
    startDate: string
    endDate: string | null
    location: string
    description: string
    provider: string
    affectedProperties: number
  }>).map((item) => ({
    id: item.id,
    title: item.title,
    category: item.category,
    status: normalizeStatus(item.status),
    startDate: item.startDate,
    endDate: item.endDate,
    location: item.location,
    description: item.description,
    type: 'boilWaterNotices',
    provider: item.provider,
    affectedProperties: item.affectedProperties,
  }))
}

const transformWeatherHazards = (): WeatherHazardEvent[] => {
  const events: WeatherHazardEvent[] = []
  ;(weatherHazardsData as Array<{
    id: number
    title: string
    start_date: string
    hazards: Array<{
      id: number
      hazard_type: string
      region: string
      location_name: string | null
      impacts: Array<{ description: string }>
    }>
  }>).forEach((event) => {
    event.hazards.forEach((hazard) => {
      events.push({
        id: `${event.id}-${hazard.id}`,
        title: `${hazard.hazard_type} - ${hazard.location_name || hazard.region}`,
        category: mapWeatherCategory(hazard.hazard_type),
        status: 'resolved',
        startDate: event.start_date,
        endDate: null,
        location: hazard.location_name || hazard.region,
        description: hazard.impacts.map(i => i.description).join(' ') || `${hazard.hazard_type} event in ${hazard.region}`,
        type: 'weatherHazards',
        hazardType: hazard.hazard_type,
        region: hazard.region,
      })
    })
  })
  return events.slice(0, 100)
}

const mapWeatherCategory = (hazardType: string): string => {
  const typeLower = hazardType.toLowerCase()
  if (typeLower.includes('storm') || typeLower.includes('thunder')) return 'Storm'
  if (typeLower.includes('flood') || typeLower.includes('rain')) return 'Flood'
  if (typeLower.includes('wind') || typeLower.includes('gust')) return 'High Wind'
  if (typeLower.includes('snow') || typeLower.includes('ice')) return 'Snow'
  if (typeLower.includes('fog')) return 'Fog'
  return 'Storm'
}

const EventsPage = () => {
  const [activeTab, setActiveTab] = useState<TabValue>('powerOutages')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [dateFrom, setDateFrom] = useState<string | null>(null)
  const [dateTo, setDateTo] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [filterModalOpened, { open: openFilterModal, close: closeFilterModal }] = useDisclosure(false)

  const [tempCategories, setTempCategories] = useState<string[]>([])
  const [tempDateFrom, setTempDateFrom] = useState<string | null>(null)
  const [tempDateTo, setTempDateTo] = useState<string | null>(null)

  const allEvents = useMemo(() => {
    const events: Record<TabValue, EventItem[]> = {
      powerOutages: transformPowerOutages(),
      roadClosures: transformRoadClosures(),
      schoolClosures: transformSchoolClosures(),
      boilWaterNotices: transformBoilWaterNotices(),
      weatherHazards: transformWeatherHazards(),
    }
    return events
  }, [])

  const currentEvents = allEvents[activeTab]

  const filteredEvents = useMemo(() => {
    let filtered = [...currentEvents]

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (event) =>
          event.title.toLowerCase().includes(query) ||
          event.location.toLowerCase().includes(query) ||
          event.description.toLowerCase().includes(query) ||
          event.category.toLowerCase().includes(query)
      )
    }

    if (selectedCategories.length > 0) {
      filtered = filtered.filter((event) => selectedCategories.includes(event.category))
    }

    if (dateFrom) {
      const fromDate = new Date(dateFrom)
      filtered = filtered.filter((event) => {
        const eventStart = new Date(event.startDate)
        return eventStart >= fromDate
      })
    }

    if (dateTo) {
      const toDate = new Date(dateTo)
      filtered = filtered.filter((event) => {
        const eventEnd = event.endDate ? new Date(event.endDate) : new Date(event.startDate)
        return eventEnd <= toDate
      })
    }

    return filtered
  }, [currentEvents, searchQuery, selectedCategories, dateFrom, dateTo])

  const totalPages = Math.ceil(filteredEvents.length / ITEMS_PER_PAGE)
  const paginatedEvents = filteredEvents.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const activeFiltersCount = selectedCategories.length + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0)

  const handleTabChange = (value: string | null) => {
    if (value) {
      setActiveTab(value as TabValue)
      setCurrentPage(1)
      setSearchQuery('')
      setSelectedCategories([])
      setDateFrom(null)
      setDateTo(null)
    }
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1)
  }

  const handleOpenFilterModal = () => {
    setTempCategories([...selectedCategories])
    setTempDateFrom(dateFrom)
    setTempDateTo(dateTo)
    openFilterModal()
  }

  const handleApplyFilters = () => {
    setSelectedCategories(tempCategories)
    setDateFrom(tempDateFrom)
    setDateTo(tempDateTo)
    setCurrentPage(1)
    closeFilterModal()
  }

  const handleClearAllFilters = () => {
    setSelectedCategories([])
    setDateFrom(null)
    setDateTo(null)
    setTempCategories([])
    setTempDateFrom(null)
    setTempDateTo(null)
    setCurrentPage(1)
  }

  const handleRemoveCategory = (category: string) => {
    setSelectedCategories((prev) => prev.filter((c) => c !== category))
    setCurrentPage(1)
  }

  const handleRemoveDateFrom = () => {
    setDateFrom(null)
    setCurrentPage(1)
  }

  const handleRemoveDateTo = () => {
    setDateTo(null)
    setCurrentPage(1)
  }

  const handleCategoryToggle = (category: string) => {
    setTempCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    )
  }

  const tabConfig = TAB_CONFIG[activeTab]

  return (
    <Box bg="#f8f9fa" mih="100vh">
      <Container size="xl" py="md">
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tabs.List
            style={{
              overflowX: 'auto',
              flexWrap: 'nowrap',
              borderBottom: 'none',
              gap: rem(8),
            }}
          >
            {(Object.keys(TAB_CONFIG) as TabValue[]).map((tabKey) => {
              const config = TAB_CONFIG[tabKey]
              const Icon = config.icon
              const isActive = activeTab === tabKey
              return (
                <Tabs.Tab
                  key={tabKey}
                  value={tabKey}
                  leftSection={<Icon size={18} />}
                  style={{
                    backgroundColor: isActive ? '#228be6' : 'transparent',
                    color: isActive ? 'white' : '#666',
                    borderRadius: rem(20),
                    border: 'none',
                    fontWeight: 500,
                    padding: `${rem(8)} ${rem(16)}`,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {config.label}
                </Tabs.Tab>
              )
            })}
          </Tabs.List>
        </Tabs>

        <Box mt="lg">
          <Flex gap="md" align="flex-start" wrap="wrap">
            <TextInput
              placeholder="Search events by title, location, or description..."
              leftSection={<IconSearch size={18} color="#868e96" />}
              rightSection={
                searchQuery ? (
                  <CloseButton size="sm" onClick={() => handleSearchChange('')} />
                ) : null
              }
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.currentTarget.value)}
              style={{ flex: 1, minWidth: rem(300) }}
              styles={{
                input: {
                  borderRadius: rem(8),
                  border: '1px solid #dee2e6',
                  backgroundColor: 'white',
                },
              }}
            />
            <Button
              leftSection={<IconFilter size={18} />}
              rightSection={
                activeFiltersCount > 0 ? (
                  <Badge size="sm" circle color="white" c="#228be6">
                    {activeFiltersCount}
                  </Badge>
                ) : null
              }
              onClick={handleOpenFilterModal}
              color="blue"
              style={{ borderRadius: rem(8) }}
            >
              Filter
            </Button>
          </Flex>

          {(selectedCategories.length > 0 || dateFrom || dateTo) && (
            <Group mt="md" gap="xs">
              <Text size="sm" c="dimmed">
                Active filters:
              </Text>
              {selectedCategories.map((category) => (
                <Badge
                  key={category}
                  variant="light"
                  color="blue"
                  rightSection={
                    <CloseButton
                      size="xs"
                      onClick={() => handleRemoveCategory(category)}
                      style={{ marginLeft: rem(4) }}
                    />
                  }
                  style={{ cursor: 'pointer' }}
                >
                  {category}
                </Badge>
              ))}
              {dateFrom && (
                <Badge
                  variant="light"
                  color="blue"
                  rightSection={
                    <CloseButton
                      size="xs"
                      onClick={handleRemoveDateFrom}
                      style={{ marginLeft: rem(4) }}
                    />
                  }
                  style={{ cursor: 'pointer' }}
                >
                  From: {formatDate(dateFrom)}
                </Badge>
              )}
              {dateTo && (
                <Badge
                  variant="light"
                  color="blue"
                  rightSection={
                    <CloseButton
                      size="xs"
                      onClick={handleRemoveDateTo}
                      style={{ marginLeft: rem(4) }}
                    />
                  }
                  style={{ cursor: 'pointer' }}
                >
                  To: {formatDate(dateTo)}
                </Badge>
              )}
              <Text
                size="sm"
                c="red"
                style={{ cursor: 'pointer' }}
                onClick={handleClearAllFilters}
              >
                Clear all
              </Text>
            </Group>
          )}
        </Box>

        <Flex justify="space-between" align="center" mt="lg" mb="md">
          <Text size="sm" c="dimmed">
            Showing {paginatedEvents.length} of {filteredEvents.length} results
          </Text>
          <Text size="sm" c="dimmed">
            Page {currentPage} of {totalPages || 1}
          </Text>
        </Flex>

        {paginatedEvents.length > 0 ? (
          <SimpleGrid
            cols={{ base: 1, sm: 2, md: 3, lg: 4 }}
            spacing="lg"
          >
            {paginatedEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </SimpleGrid>
        ) : (
          <Card
            withBorder
            p="xl"
            radius="md"
            style={{ textAlign: 'center', backgroundColor: 'white' }}
          >
            <IconSearch size={48} color="#868e96" style={{ margin: '0 auto' }} />
            <Text size="lg" fw={500} mt="md">
              No events found
            </Text>
            <Text size="sm" c="dimmed" mt="xs">
              Try adjusting your search or filter criteria
            </Text>
          </Card>
        )}

        {totalPages > 1 && (
          <Flex justify="center" mt="xl">
            <Pagination
              total={totalPages}
              value={currentPage}
              onChange={setCurrentPage}
              withEdges
              color="blue"
            />
          </Flex>
        )}

        <Modal
          opened={filterModalOpened}
          onClose={closeFilterModal}
          title="Filter Events"
          size="md"
        >
          <Stack gap="lg">
            <Box>
              <Text fw={500} mb="sm">
                Categories
              </Text>
              <Stack gap="xs">
                {tabConfig.categories.map((category) => (
                  <Checkbox
                    key={category}
                    label={category}
                    checked={tempCategories.includes(category)}
                    onChange={() => handleCategoryToggle(category)}
                  />
                ))}
              </Stack>
            </Box>

            <Box>
              <Text fw={500} mb="sm">
                Date Range
              </Text>
              <Stack gap="sm">
                <DateInput
                  label="From"
                  placeholder="Select date"
                  value={tempDateFrom}
                  onChange={setTempDateFrom}
                  leftSection={<IconCalendar size={18} />}
                  valueFormat="DD MMM YYYY"
                  clearable
                />
                <DateInput
                  label="To"
                  placeholder="Select date"
                  value={tempDateTo}
                  onChange={setTempDateTo}
                  leftSection={<IconCalendar size={18} />}
                  valueFormat="DD MMM YYYY"
                  minDate={tempDateFrom ? new Date(tempDateFrom) : undefined}
                  clearable
                />
              </Stack>
            </Box>

            <Flex justify="space-between" mt="md">
              <Button
                variant="subtle"
                onClick={() => {
                  setTempCategories([])
                  setTempDateFrom(null)
                  setTempDateTo(null)
                }}
              >
                Clear All
              </Button>
              <Button onClick={handleApplyFilters}>Apply Filters</Button>
            </Flex>
          </Stack>
        </Modal>
      </Container>
    </Box>
  )
}

interface EventCardProps {
  event: EventItem
}

const EventCard = ({ event }: EventCardProps) => {
  const tabConfig = TAB_CONFIG[event.type]
  const Icon = tabConfig.icon
  const statusConfig = STATUS_COLORS[event.status] || STATUS_COLORS.active
  const categoryColor = CATEGORY_COLORS[event.category] || '#228be6'
  const displayStatus = getDisplayStatus(event.status)

  return (
    <Card
      withBorder
      radius="md"
      style={{
        backgroundColor: 'white',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.2s, box-shadow 0.2s',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)'
        e.currentTarget.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.1)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = ''
      }}
    >
      <Card.Section withBorder inheritPadding py="xs">
        <Group gap="xs" wrap="nowrap">
          <Icon size={18} color={tabConfig.color} style={{ flexShrink: 0 }} />
          <Text
            fw={600}
            size="sm"
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
            }}
          >
            {event.title}
          </Text>
        </Group>
      </Card.Section>

      <Box p="md" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Group gap="xs" mb="sm">
          <Badge
            variant="light"
            size="sm"
            style={{
              backgroundColor: `${categoryColor}15`,
              color: categoryColor,
            }}
          >
            {event.category}
          </Badge>
          <Badge
            variant="light"
            size="sm"
            leftSection={
              <Box
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: statusConfig.color,
                }}
              />
            }
            style={{
              backgroundColor: statusConfig.bgColor,
              color: statusConfig.color,
            }}
          >
            {displayStatus}
          </Badge>
        </Group>

        <Group gap="xs" mb="xs">
          <IconMapPin size={14} color="#868e96" />
          <Text size="xs" c="dimmed" lineClamp={1}>
            {event.location}
          </Text>
        </Group>

        <Group gap="xs" mb="sm">
          <IconCalendar size={14} color="#868e96" />
          <Text size="xs" c="dimmed">
            {formatDateRange(event.startDate, event.endDate)}
          </Text>
        </Group>

        <Text size="sm" c="dimmed" lineClamp={3} style={{ flex: 1 }}>
          {event.description}
        </Text>
      </Box>
    </Card>
  )
}

export default EventsPage

import { AppShell, Box, Drawer, ActionIcon } from '@mantine/core'
import { useDisclosure, useMediaQuery } from '@mantine/hooks'
import { useState, useEffect } from 'react'
import { IconMenu2, IconX } from '@tabler/icons-react'
import MapView from './components/MapView'
import MapViewRoad from './components/MapViewRoad'
import HazardsView from './components/HazardsView'
import Header from './components/Header'
import Sidebar from './components/Sidebar.tsx'
import SidebarOutages from './components/SidebarOutages.tsx'
import SidebarRoad from './components/SidebarRoad.tsx'
import SidebarWeather from './components/SidebarWeather.tsx'
import EventsPage from './pages/EventsPage'
import AboutPage from './pages/AboutPage'
import { eventTypes } from './data/eventTypes'
import roadClosuresData from './data/roadClosures.json'
import weatherEventsData from './data/historicWeatherHazards.json'
import { useOutageStore } from './stores/outageStore'
import type { Outage } from './types/outage'
import type { RoadClosure } from './types/road'
import type { WeatherEvent, Hazard } from './types/weather'

type PageType = 'map' | 'events' | 'about'

function App() {
  const [opened, { toggle, close }] = useDisclosure()
  const [currentPage, setCurrentPage] = useState<PageType>('map')
  
  // Responsive breakpoints
  const isMobile = useMediaQuery('(max-width: 767px)')
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 991px)')
  
  // Get sidebar width based on breakpoint
  const getSidebarWidth = () => {
    if (isTablet) return 280
    return 320 // Desktop default
  }
  
  const [selectedEventType, setSelectedEventType] = useState<string | null>(null)
  const [selectedOutageId, setSelectedOutageId] = useState<string | null>(null)
  const [selectedRoadId, setSelectedRoadId] = useState<string | null>(null)
  const [selectedWeatherEventId, setSelectedWeatherEventId] = useState<number | null>(null)
  const [selectedHazardId, setSelectedHazardId] = useState<number | null>(null)
  const [showAllWeatherHazards, setShowAllWeatherHazards] = useState<boolean>(true)

  // Outage store state
  const { outages, fetchOutages } = useOutageStore()

  // Fetch outages on mount
  useEffect(() => {
    fetchOutages()
  }, [fetchOutages])

    const handleSelectEventType = (eventTypeId: string) => {
      setSelectedEventType(eventTypeId)
      setSelectedOutageId(null)
      setSelectedRoadId(null)
      setSelectedWeatherEventId(null)
      setSelectedHazardId(null)
      setShowAllWeatherHazards(true)
    }

    const handleBack = () => {
      setSelectedEventType(null)
      setSelectedOutageId(null)
      setSelectedRoadId(null)
      setSelectedWeatherEventId(null)
      setSelectedHazardId(null)
      setShowAllWeatherHazards(true)
    }

    const handleOutageSelect = (outageId: string) => {
      setSelectedOutageId(outageId)
    }

    const handleRoadSelect = (roadId: string) => {
      setSelectedRoadId(roadId)
    }

  const handleWeatherEventSelect = (eventId: number) => {
    setSelectedWeatherEventId(eventId)
    setSelectedHazardId(null)
    setShowAllWeatherHazards(false)
  }

  const handleShowAllWeatherHazards = () => {
    setSelectedWeatherEventId(null)
    setSelectedHazardId(null)
    setShowAllWeatherHazards(true)
  }

  const getEventTypeName = (eventTypeId: string) => {
    const eventType = eventTypes.find(et => et.id === eventTypeId)
    return eventType?.name || ''
  }

    const getEventData = (): Outage[] => {
      if (selectedEventType === 'power-outages') {
        return outages
      }
      return []
    }

    const getRoadClosuresData = (): RoadClosure[] => {
      if (selectedEventType === 'road-closures') {
        return roadClosuresData as RoadClosure[]
      }
      return []
    }

  const getWeatherHazardsData = (): Hazard[] => {
    const events = weatherEventsData as WeatherEvent[]
    
    if (selectedWeatherEventId !== null) {
      const selectedEvent = events.find(e => e.id === selectedWeatherEventId)
      if (selectedEvent) {
        return selectedEvent.hazards.filter(h => h.latitude !== null && h.longitude !== null)
      }
    }
    
    if (showAllWeatherHazards) {
      return events.flatMap(event => 
        event.hazards.filter(h => h.latitude !== null && h.longitude !== null)
      )
    }
    
    return []
  }

  const getSelectedEventTitle = (): string | undefined => {
    if (selectedWeatherEventId !== null) {
      const events = weatherEventsData as WeatherEvent[]
      const selectedEvent = events.find(e => e.id === selectedWeatherEventId)
      return selectedEvent?.title
    }
    return undefined
  }

  const renderSidebar = () => {
    if (!selectedEventType) {
      return <Sidebar onSelectEventType={handleSelectEventType} />
    }

    switch (selectedEventType) {
      case 'power-outages':
        return (
          <SidebarOutages
            eventTypeName={getEventTypeName(selectedEventType)}
            onBack={handleBack}
            onOutageSelect={handleOutageSelect}
            selectedOutageId={selectedOutageId}
          />
        )
            case 'road-closures':
              return (
                <SidebarRoad
                  eventTypeName={getEventTypeName(selectedEventType)}
                  onBack={handleBack}
                  onRoadSelect={handleRoadSelect}
                  selectedRoadId={selectedRoadId}
                />
              )
      case 'historic-weather-hazards':
        return (
          <SidebarWeather
            eventTypeName={getEventTypeName(selectedEventType)}
            onBack={handleBack}
            onEventSelect={handleWeatherEventSelect}
            onShowAllHazards={handleShowAllWeatherHazards}
            selectedEventId={selectedWeatherEventId}
          />
        )
      default:
        return <Sidebar onSelectEventType={handleSelectEventType} />
    }
  }

    const renderMapView = () => {
      if (selectedEventType === 'historic-weather-hazards') {
        return (
          <HazardsView 
            hazards={getWeatherHazardsData()} 
            selectedHazardId={selectedHazardId}
            eventTitle={getSelectedEventTitle()}
            onHazardSelect={setSelectedHazardId}
          />
        )
      }

      if (selectedEventType === 'road-closures') {
        return (
          <MapViewRoad 
            roadClosures={getRoadClosuresData()} 
            selectedRoadId={selectedRoadId}
          />
        )
      }
    
      return <MapView outages={getEventData()} selectedOutageId={selectedOutageId} />
    }

  const handleNavigate = (page: PageType) => {
    setCurrentPage(page)
    if (page === 'map') {
      handleBack()
    }
  }

  if (currentPage === 'events') {
    return (
      <Box style={{ minHeight: '100vh' }}>
        <Box
          style={{
            height: 60,
            borderBottom: '1px solid #e0e0e0',
            position: 'sticky',
            top: 0,
            backgroundColor: 'white',
            zIndex: 1000,
          }}
        >
          <Header opened={opened} toggle={toggle} currentPage="events" onNavigate={handleNavigate} />
        </Box>
        <EventsPage />
      </Box>
    )
  }

  if (currentPage === 'about') {
    return (
      <Box style={{ minHeight: '100vh' }}>
        <Box
          style={{
            height: 60,
            borderBottom: '1px solid #e0e0e0',
            position: 'sticky',
            top: 0,
            backgroundColor: 'white',
            zIndex: 1000,
          }}
        >
          <Header opened={opened} toggle={toggle} currentPage="about" onNavigate={handleNavigate} />
        </Box>
        <AboutPage />
      </Box>
    )
  }

  // Mobile layout with Drawer
  if (isMobile) {
    return (
      <Box style={{ minHeight: '100vh', position: 'relative' }}>
        {/* Header */}
        <Box
          style={{
            height: 60,
            borderBottom: '1px solid #e0e0e0',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            backgroundColor: 'white',
            zIndex: 1000,
          }}
        >
          <Header opened={opened} toggle={toggle} currentPage="map" onNavigate={handleNavigate} />
        </Box>

        {/* Mobile Drawer */}
        <Drawer
          opened={opened}
          onClose={close}
          size="85%"
          styles={{
            root: { zIndex: 1001 },
            content: { 
              maxWidth: 320,
              overflowY: 'auto',
            },
            body: { 
              padding: 16,
              height: '100%',
            },
            header: { display: 'none' },
            overlay: { backgroundColor: 'rgba(0, 0, 0, 0.5)' },
          }}
          transitionProps={{ 
            transition: 'slide-right', 
            duration: 300, 
            timingFunction: 'ease' 
          }}
          withCloseButton={false}
          position="left"
        >
          {/* Close button inside drawer */}
          <Box style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="lg"
              onClick={close}
              aria-label="Close sidebar"
            >
              <IconX size={20} />
            </ActionIcon>
          </Box>
          {renderSidebar()}
        </Drawer>

        {/* Floating toggle button for mobile */}
        {!opened && (
          <ActionIcon
            variant="filled"
            color="cyan"
            size="xl"
            radius="xl"
            onClick={toggle}
            aria-label="Open sidebar"
            style={{
              position: 'fixed',
              top: 70,
              left: 16,
              zIndex: 999,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            }}
          >
            <IconMenu2 size={24} />
          </ActionIcon>
        )}

        {/* Map content - full width on mobile */}
        <Box style={{ 
          paddingTop: 60, 
          height: '100vh',
          width: '100%',
        }}>
          <Box style={{ height: 'calc(100vh - 60px)', width: '100%' }}>
            {renderMapView()}
          </Box>
        </Box>
      </Box>
    )
  }

  // Desktop/Tablet layout with AppShell
  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: getSidebarWidth(),
        breakpoint: 'xs',
        collapsed: { mobile: false },
      }}
      padding={0}
      styles={{
        navbar: {
          transition: 'width 0.3s ease',
        },
      }}
    >
      <AppShell.Header style={{ borderBottom: '1px solid #e0e0e0', zIndex: 1000 }}>
        <Header opened={opened} toggle={toggle} currentPage="map" onNavigate={handleNavigate} />
      </AppShell.Header>

      <AppShell.Navbar p="md" style={{ overflowY: 'auto', zIndex: 900 }}>
        {renderSidebar()}
      </AppShell.Navbar>

      <AppShell.Main style={{ padding: 0, position: 'relative', height: 'calc(100dvh - 60px)', zIndex: 0 }}>
        {renderMapView()}
      </AppShell.Main>
    </AppShell>
  )
}

export default App

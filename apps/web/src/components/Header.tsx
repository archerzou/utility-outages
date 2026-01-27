import { Group, Text, Anchor, Burger } from '@mantine/core'
import mapLogo from '../assets/map.png'

interface HeaderProps {
  opened: boolean
  toggle: () => void
  currentPage?: 'map' | 'events' | 'about'
  onNavigate?: (page: 'map' | 'events' | 'about') => void
}

const Header = ({ opened, toggle, currentPage = 'map', onNavigate }: HeaderProps) => {
  const handleNavClick = (page: 'map' | 'events' | 'about') => {
    if (onNavigate) {
      onNavigate(page)
    }
  }

  return (
    <Group h="100%" px="md" justify="space-between">
      <Group gap="sm">
        <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
        <img src={mapLogo} alt="Event Map Logo" style={{ width: 32, height: 32 }} />
        <Text size="lg" fw={600} c="#00bcd4">
          Event Map
        </Text>
      </Group>

      <Group gap="lg" visibleFrom="sm">
        <Anchor
          href="#"
          underline="never"
          c={currentPage === 'map' ? '#00bcd4' : 'dimmed'}
          fw={500}
          onClick={(e) => {
            e.preventDefault()
            handleNavClick('map')
          }}
        >
          Map
        </Anchor>
        <Anchor
          href="#"
          underline="never"
          c={currentPage === 'events' ? '#00bcd4' : 'dimmed'}
          fw={500}
          onClick={(e) => {
            e.preventDefault()
            handleNavClick('events')
          }}
        >
          Events
        </Anchor>
        <Anchor
          href="#"
          underline="never"
          c={currentPage === 'about' ? '#00bcd4' : 'dimmed'}
          fw={500}
          onClick={(e) => {
            e.preventDefault()
            handleNavClick('about')
          }}
        >
          About
        </Anchor>
      </Group>
    </Group>
  )
}

export default Header

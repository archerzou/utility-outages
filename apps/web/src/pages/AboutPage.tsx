import { Container, Text, Box, Card, Group, Image } from '@mantine/core'
import mapLogo from '../assets/map.png'

const AboutPage = () => {
  return (
    <Box style={{ backgroundColor: '#f8f9fa', minHeight: 'calc(100vh - 60px)' }}>
      <Container size="md" py="xl">
        <Card withBorder radius="md" p="xl" style={{ backgroundColor: 'white' }}>
          <Group gap="sm" mb="md">
            <Image src={mapLogo} alt="NZ Event Monitor Logo" w={32} h={32} />
            <Text fw={600} size="xl">
              Our Mission
            </Text>
          </Group>

          <Text c="dimmed" mb="lg" style={{ lineHeight: 1.7 }}>
            NZ Event Monitor is dedicated to keeping New Zealanders informed about critical
            infrastructure events and public safety notices across the country. We aggregate
            real-time data from multiple sources to provide a comprehensive, easy-to-use
            platform for staying aware of events that may affect your daily life.
          </Text>

          <Text c="dimmed" style={{ lineHeight: 1.7 }}>
            Whether it's a power outage in your neighbourhood, road closures affecting your
            commute, or important water quality notices, we ensure you have access to timely,
            accurate information when you need it most.
          </Text>
        </Card>
      </Container>
    </Box>
  )
}

export default AboutPage

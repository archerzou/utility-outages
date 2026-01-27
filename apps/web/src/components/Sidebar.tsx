import { Stack, Title, UnstyledButton, Group, Text } from '@mantine/core'
import { eventTypes } from '../data/eventTypes'

interface SidebarHomeProps {
  onSelectEventType: (eventTypeId: string) => void
}

const Sidebar = ({ onSelectEventType }: SidebarHomeProps) => {
  return (
    <Stack gap="md">
      <Title order={4} c="#00bcd4">Visible Events</Title>

      <Stack gap={0}>
        {eventTypes.map((eventType) => {
          const Icon = eventType.icon
          return (
            <UnstyledButton
              key={eventType.id}
              onClick={() => onSelectEventType(eventType.id)}
              style={{
                padding: '16px',
                borderBottom: '1px solid #e0e0e0',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f5f5f5'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              <Group gap="md">
                <Icon size={24} color="#666" />
                <Text size="md" c="#666" fw={500}>
                  {eventType.name}
                </Text>
              </Group>
            </UnstyledButton>
          )
        })}
      </Stack>
    </Stack>
  )
}

export default Sidebar

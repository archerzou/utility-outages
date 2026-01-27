import { Container, Title, Text, Stack } from '@mantine/core'
import { IconHeart } from '@tabler/icons-react'

const TrackedEventsPage = () => {
  return (
    <Container size="md" py="xl">
      <Stack gap="md">
        <Title order={1}>
          <IconHeart size={32} style={{ verticalAlign: 'middle', marginRight: 8 }} />
          Tracked Events
        </Title>
        <Text>
          Keep track of events that matter to you. Save events to your tracked list
          to receive updates and notifications.
        </Text>
      </Stack>
    </Container>
  )
}

export default TrackedEventsPage

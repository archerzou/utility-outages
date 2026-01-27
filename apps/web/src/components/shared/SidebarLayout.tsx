import { Stack, Title, Button } from '@mantine/core'
import { IconArrowLeft } from '@tabler/icons-react'
import type { ReactNode } from 'react'

interface SidebarLayoutProps {
  eventTypeName: string
  onBack: () => void
  children: ReactNode
}

const SidebarLayout = ({ eventTypeName, onBack, children }: SidebarLayoutProps) => {
  return (
    <Stack gap="md">
      <Button
        variant="subtle"
        leftSection={<IconArrowLeft size={16} />}
        onClick={onBack}
        style={{ justifyContent: 'flex-start', padding: '8px' }}
        c="#00bcd4"
      >
        All events
      </Button>

      <Title order={4} c="#00bcd4">
        {eventTypeName}
      </Title>

      {children}
    </Stack>
  )
}

export default SidebarLayout

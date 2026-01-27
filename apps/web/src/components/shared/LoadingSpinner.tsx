/**
 * Loading Spinner Component
 * Displays a loading indicator during data fetching
 */

import { Center, Loader, Stack, Text } from '@mantine/core'

interface LoadingSpinnerProps {
  message?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  fullHeight?: boolean
}

const LoadingSpinner = ({ 
  message = 'Loading...', 
  size = 'lg',
  fullHeight = false 
}: LoadingSpinnerProps) => {
  return (
    <Center 
      style={{ 
        height: fullHeight ? '100%' : 'auto',
        minHeight: fullHeight ? '200px' : 'auto',
        padding: '2rem'
      }}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Stack align="center" gap="md">
        <Loader size={size} aria-label={message} />
        <Text size="sm" c="dimmed" aria-hidden="true">
          {message}
        </Text>
      </Stack>
    </Center>
  )
}

export default LoadingSpinner

/**
 * Error Display Component
 * Shows user-friendly error messages with retry capability
 */

import { Alert, Button, Stack, Text } from '@mantine/core'
import { IconAlertCircle, IconRefresh } from '@tabler/icons-react'

interface ErrorDisplayProps {
  message: string
  onRetry?: () => void
  showRetry?: boolean
}

const ErrorDisplay = ({ 
  message, 
  onRetry, 
  showRetry = true 
}: ErrorDisplayProps) => {
  return (
    <Alert
      icon={<IconAlertCircle size={20} />}
      title="Error loading data"
      color="red"
      variant="light"
      role="alert"
      aria-live="assertive"
    >
      <Stack gap="sm">
        <Text size="sm">{message}</Text>
        {showRetry && onRetry && (
          <Button
            variant="light"
            color="red"
            size="xs"
            leftSection={<IconRefresh size={14} />}
            onClick={onRetry}
            aria-label="Retry loading data"
          >
            Try Again
          </Button>
        )}
      </Stack>
    </Alert>
  )
}

export default ErrorDisplay

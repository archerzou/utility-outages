export function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString)
    return date.toLocaleDateString('en-NZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return 'Invalid date'
  }
}

export function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString)
    return date.toLocaleTimeString('en-NZ', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  } catch {
    return 'Invalid time'
  }
}

export function formatDateTime(isoString: string): string {
  try {
    const date = new Date(isoString)
    const dateStr = date.toLocaleDateString('en-NZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
    const timeStr = date.toLocaleTimeString('en-NZ', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    return `${dateStr} at ${timeStr}`
  } catch {
    return 'Invalid date/time'
  }
}

export function formatTimeRange(startTime: string, endTime: string | null): string {
  try {
    const start = new Date(startTime)
    const startDateStr = start.toLocaleDateString('en-NZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
    const startTimeStr = start.toLocaleTimeString('en-NZ', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })

    if (!endTime) {
      return `${startDateStr}, ${startTimeStr} - Ongoing`
    }

    const end = new Date(endTime)
    const endDateStr = end.toLocaleDateString('en-NZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
    const endTimeStr = end.toLocaleTimeString('en-NZ', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })

    if (startDateStr === endDateStr) {
      return `${startDateStr}, ${startTimeStr} - ${endTimeStr}`
    }

    return `${startDateStr}, ${startTimeStr} - ${endDateStr}, ${endTimeStr}`
  } catch {
    return 'Invalid time range'
  }
}

export function getRelativeTime(isoString: string): string {
  try {
    const date = new Date(isoString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSecs = Math.floor(diffMs / 1000)
    const diffMins = Math.floor(diffSecs / 60)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMs < 0) {
      const absDiffDays = Math.abs(diffDays)
      const absDiffHours = Math.abs(diffHours)
      const absDiffMins = Math.abs(diffMins)

      if (absDiffDays > 0) {
        return `in ${absDiffDays} day${absDiffDays !== 1 ? 's' : ''}`
      }
      if (absDiffHours > 0) {
        return `in ${absDiffHours} hour${absDiffHours !== 1 ? 's' : ''}`
      }
      if (absDiffMins > 0) {
        return `in ${absDiffMins} minute${absDiffMins !== 1 ? 's' : ''}`
      }
      return 'in a moment'
    }

    if (diffDays > 0) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
    }
    if (diffHours > 0) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
    }
    if (diffMins > 0) {
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`
    }
    return 'just now'
  } catch {
    return 'Unknown'
  }
}

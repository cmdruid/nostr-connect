import { useEffect, useState } from 'react'

export function NotificationConfig() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check current notification permission status
  const checkPermission = () => {
    if ('Notification' in window) {
      setPermission(Notification.permission)
    }
  }

  // Request notification permission
  const requestPermission = async () => {
    if (!('Notification' in window)) {
      setError('This browser does not support notifications')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      
      if (result === 'denied') {
        setError('Notification permission was denied. You can enable it in your browser settings.')
      }
    } catch (err) {
      setError('Failed to request notification permission')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle checkbox change
  const handleToggle = () => {
    if (permission === 'granted') {
      setError('Notifications are already enabled. To disable them, please change your browser settings.')
    } else if (permission === 'denied') {
      setError('Notifications were previously denied. Please enable them in your browser settings.')
    } else {
      requestPermission()
    }
  }

  // Clear error after some time
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  // Check permission on mount
  useEffect(() => {
    checkPermission()
  }, [])

  const isChecked = permission === 'granted'
  const isDisabled = isLoading || !('Notification' in window)

  return (
    <div className="container">
      <h2 className="section-header">Notification Permissions</h2>
      <p className="description">
        Enable browser notifications to receive alerts when new requests arrive or when important events occur.
      </p>
      
      <div className="input-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={handleToggle}
            disabled={isDisabled}
            className="notification-checkbox"
          />
          <span className="checkbox-text">
            {isLoading ? 'Requesting permission...' : 'Enable notifications'}
          </span>
        </label>
      </div>

      <div className="permission-status">
        <span className={`status-indicator ${permission}`}>
          {permission === 'granted' && '✓ Notifications enabled'}
          {permission === 'denied' && '✗ Notifications blocked'}
          {permission === 'default' && '○ Not configured'}
        </span>
      </div>

      <div className="notification-container">
        {error && <p className="error-text">{error}</p>}
      </div>

      {!('Notification' in window) && (
        <div className="notification-container">
          <p className="error-text">Notifications are not supported in this browser</p>
        </div>
      )}
    </div>
  )
} 
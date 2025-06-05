import { useEffect, useRef, useState } from 'react'
import QrScanner from 'qr-scanner'

interface QRScannerProps {
  onResult: (result: string) => void
  onError?: (error: Error)   => void
}

const styles = {
  container: {
    width: '100%',
    maxWidth: '400px',
    margin: '1rem auto',
    border: '1px solid #ccc',
    borderRadius: '4px',
    overflow: 'hidden',
    position: 'relative' as const,
    backgroundColor: '#000'
  },
  video: {
    width: '100%',
    height: 'auto',
    display: 'block'
  }
} as const

export function QRScanner({ onResult, onError }: QRScannerProps) {
  const videoRef   = useRef<HTMLVideoElement>(null)
  const scannerRef = useRef<QrScanner | null>(null)

  const [ error,   setError ] = useState<string | null>(null)
  const [ hasPerm, setPerm  ] = useState<boolean | null>(null)

  useEffect(() => {
    let scanner: QrScanner | null = null

    const initializeScanner = async () => {
      if (!videoRef.current) {
        setError('Video element not found')
        return
      }

      try {
        scanner = new QrScanner(
          videoRef.current,
          (result : QrScanner.ScanResult) => {
            onResult(result.data)
            scanner?.stop()
          },
          { returnDetailedScanResult: true }
        )

        // Start scanning
        await scanner.start()
        setError(null)
        setPerm(true)
        scannerRef.current = scanner
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to initialize scanner')
        setError(error.message)
        if (onError) {
          onError(error)
        } else {
          console.error('Failed to start QR scanner:', error)
        }
      }
    }

    initializeScanner()

    return () => {
      if (scanner) {
        scanner.stop()
        scanner.destroy()
      }
    }
  }, [onResult, onError])

  return (
    <div style={styles.container}>
      <video 
        ref={videoRef} 
        style={styles.video} 
        playsInline 
        autoPlay 
        muted
      />
      {error && (
        <div style={{ 
          position: 'absolute', 
          top: '50%', 
          left: '50%', 
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '1rem',
          borderRadius: '4px',
          textAlign: 'center' as const,
          zIndex: 1000
        }}>
          {error}
          {hasPerm === false && (
            <div style={{ marginTop: '1rem' }}>
              Please grant camera permissions to use the QR scanner
            </div>
          )}
        </div>
      )}
    </div>
  )
} 
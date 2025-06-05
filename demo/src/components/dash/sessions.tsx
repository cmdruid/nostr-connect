import { useState, useEffect } from 'react'

import { SessionToken } from '@/types/index.js'
import { TokenEncoder } from '@/lib/encoder.js'
import { useClientCtx } from '@/demo/context/client.js'

export function Sessions() {
  const client = useClientCtx()

  const [activeSessions, setActiveSessions]   = useState<Map<string, SessionToken>>(new Map())
  const [pendingSessions, setPendingSessions] = useState<Map<string, SessionToken>>(new Map())
  const [issuedSessions, setIssuedSessions]   = useState<Map<string, SessionToken>>(new Map())
  const [connectString, setConnectString]     = useState('')
  const [error, setError] = useState<string | null>(null)

  // Update sessions when they change
  useEffect(() => {
    const ref     = client.ref.current
    const session = ref?.session
    const updateSessions = () => {
      setActiveSessions(new Map(session?.active || []))
      setPendingSessions(new Map(session?.pending || []))
      setIssuedSessions(new Map(session?.issued || []))
    }

    // Initial update
    updateSessions()

    // Listen for session changes
    ref?.on('activate', updateSessions)
    ref?.on('register', updateSessions)
    ref?.on('issue', updateSessions)

    return () => {
      ref?.off('activate', updateSessions)
      ref?.off('register', updateSessions)
      ref?.off('issue', updateSessions)
    }
  }, [client])

  const handleDeleteSession = (pubkey: string) => {
    const ref     = client.ref.current
    const session = ref?.session
    session?.delete(pubkey)
    setActiveSessions(new Map(session?.active || []))
  }

  const handleActivateSession = async () => {
    try {
      setError(null)
      const token = TokenEncoder.connect.decode(connectString)
      await client.ref.current?.session?.register(token)
      setConnectString('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate session')
    }
  }

  const handleGenerateSession = () => {
    const ref     = client.ref.current
    const session = ref?.session
    const token   = session?.generate()
    if (!token) return
    const connectString = TokenEncoder.session.encode(token)
    navigator.clipboard.writeText(connectString)
  }

  return (
    <div className="sessions-container">
      <h2 className="section-header">Session Management</h2>

      {/* Active Sessions */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Active Sessions</h3>
        {activeSessions.size === 0 ? (
          <p className="text-gray-500">No active sessions</p>
        ) : (
          <div className="space-y-2">
            {Array.from(activeSessions.entries()).map(([pubkey]) => (
              <div key={pubkey} className="flex items-center justify-between p-2 bg-gray-100 rounded">
                <span className="font-mono text-sm">{pubkey}</span>
                <button
                  onClick={() => handleDeleteSession(pubkey)}
                  className="button button-danger"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Issued Sessions */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Issued Sessions</h3>
        {issuedSessions.size === 0 ? (
          <p className="text-gray-500">No issued sessions</p>
        ) : (
          <div className="space-y-2">
            {Array.from(issuedSessions.entries()).map(([secret, token]) => (
              <div key={secret} className="p-2 bg-gray-100 rounded">
                <p className="font-mono text-sm">Secret: {secret}</p>
                <p className="text-sm text-gray-600">Expires in: {client.ref.current?.config.req_timeout}s</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending Sessions */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Pending Sessions</h3>
        {pendingSessions.size === 0 ? (
          <p className="text-gray-500">No pending sessions</p>
        ) : (
          <div className="space-y-2">
            {Array.from(pendingSessions.entries()).map(([pubkey]) => (
              <div key={pubkey} className="p-2 bg-gray-100 rounded">
                <p className="font-mono text-sm">Pubkey: {pubkey}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Activate Session */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Activate Session</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={connectString}
            onChange={(e) => setConnectString(e.target.value)}
            placeholder="Paste nostrconnect:// string here"
            className="flex-1 p-2 border rounded"
          />
          <button
            onClick={handleActivateSession}
            className="button button-primary"
          >
            Activate
          </button>
        </div>
        {error && <p className="mt-2 text-red-600">{error}</p>}
      </div>

      {/* Generate Session */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Generate Session</h3>
        <button
          onClick={handleGenerateSession}
          className="button button-primary"
        >
          Generate & Copy bunker:// String
        </button>
      </div>
    </div>
  )
} 
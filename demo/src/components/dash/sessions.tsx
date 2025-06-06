import { useState, useEffect } from 'react'
import '@/styles/sessions.css'

import { SessionToken } from '@/types/index.js'
import { TokenEncoder } from '@/index.js'
import { useClientCtx } from '@/demo/context/client.js'

export function Sessions() {
  const client = useClientCtx()

  const [activeSessions, setActiveSessions]   = useState<SessionToken[]>([])
  const [pendingSessions, setPendingSessions] = useState<SessionToken[]>([])
  const [connectString, setConnectString]     = useState('')
  const [error, setError] = useState<string | null>(null)

  // Update sessions when they change
  useEffect(() => {
    const ref = client.ref.current
    const updateSessions = () => {
      setActiveSessions(ref?.session?.active   || [])
      setPendingSessions(ref?.session?.pending || [])
    }

    // Initial update
    updateSessions()

    // Listen for session changes
    ref?.on('activate', updateSessions)
    ref?.on('register', updateSessions)

    return () => {
      ref?.off('activate', updateSessions)
      ref?.off('register', updateSessions)
    }
  }, [ client ])

  const handleRevokeSession = (pubkey: string) => {
    client.ref.current?.session?.revoke_session(pubkey)
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

  // Combine active and pending sessions
  const allSessions = [
    ...activeSessions.map(s => ({ ...s, status: 'active' as const })),
    ...pendingSessions.map(s => ({ ...s, status: 'pending' as const }))
  ]

  return (
    <div className="sessions-container">
      <h2 className="section-header">Client Sessions</h2>

      {/* Combined Active and Pending Sessions */}
      <div className="sessions-section">
        {allSessions.length === 0 ? (
          <p className="session-empty">No sessions</p>
        ) : (
          <div className="sessions-list">
            {allSessions.map((session) => (
              <div key={session.pubkey} className="session-card">
                <div className="session-info">
                  <span className="session-pubkey">{session.pubkey}</span>
                  <span className="session-name">{session.name ?? 'unknown'}</span>
                  <span className="session-created">Created: {new Date(session.created_at * 1000).toLocaleString()}</span>
                </div>
                <div className="session-card-actions">
                  <span className={`session-badge ${session.status}`}>{session.status}</span>
                  {session.status === 'active' && (
                    <button
                      onClick={() => handleRevokeSession(session.pubkey)}
                      className="session-revoke-btn"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Register Session */}
      <div className="sessions-section">
        <div className="session-card-row">
          <input
            type="text"
            value={connectString}
            onChange={(e) => setConnectString(e.target.value)}
            placeholder="Paste nostrconnect:// string here"
            className="session-input"
          />
          <button
            onClick={handleActivateSession}
            className="session-btn-primary"
          >
            Connect
          </button>
        </div>
        {error && <p className="session-error">{error}</p>}
      </div>
    </div>
  )
} 
import { useState, useEffect } from 'react'

import { now }          from '@/util/index.js'
import { TokenEncoder } from '@/index.js'
import { useClientCtx } from '@/demo/context/client.js'

import type { InviteEntry, SessionToken } from '@/types/index.js'

import '@/styles/invites.css'

export function Invites() {
  const client = useClientCtx()

  const [ invites, setInvites ] = useState<InviteEntry[]>([])
  const [ current, setCurrent ] = useState<number>(now())

  const updateInvites = () => {
    const ref = client.ref
    setInvites(ref?.session.invites || [])
  }

  useEffect(() => {
    const ref = client.ref
    updateInvites()
    ref?.on('invite', updateInvites)
    ref?.on('cancelled', updateInvites)
    const interval = setInterval(() => setCurrent(now()), 1000)
    return () => {
      ref?.off('invite', updateInvites)
      ref?.off('cancelled', updateInvites)
      clearInterval(interval)
    }
  }, [ client ])

  const handleCreateInvite = () => {
    const session = client.ref?.session
    const inviteToken = session?.create_invite()
    if (!inviteToken) return
    const connectString = TokenEncoder.invite.encode(inviteToken)
    navigator.clipboard.writeText(connectString)
    updateInvites()
  }

  // Helper to format seconds as mm:ss
  function formatSeconds(secs: number) {
    if (secs <= 0) return 'expired'
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return m > 0 ? `${m}m ${s}s` : `${s}s`
  }

  return (
    <div className="invites-container">
      <h2 className="section-header">Client Invites</h2>
      <div className="invites-section">
        {invites.length === 0 ? (
          <p className="invite-empty">no open invitations</p>
        ) : (
          <div className="invites-list">
            {invites.map(([ secret, token ]) => {
              // Calculate seconds left
              const timeout     = client.ref?.config.invite_timeout || 0
              const expiresAt   = token.created_at + timeout
              const secondsLeft = Math.max(0, expiresAt - current)
              const handleDelete = () => {
                client.ref?.session.cancel_invite(secret)
                updateInvites()
              }
              return (
                <div key={secret} className="invite-card">
                  <span className="invite-uri">{TokenEncoder.invite.encode({ secret, ...token })}</span>
                  <div className="invite-meta-row">
                    <div className="invite-meta-col">
                      <div className="invite-meta-field">
                        <span className="invite-meta-key">Created:</span>
                        <span className="invite-meta-value">{new Date(token.created_at * 1000).toLocaleString()}</span>
                      </div>
                      <div className="invite-meta-field">
                        <span className="invite-meta-key">Expires:</span>
                        <span className="invite-meta-value">{formatSeconds(secondsLeft)}</span>
                      </div>
                    </div>
                    <button className="invite-btn-delete" onClick={handleDelete}>Delete</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      <button
        onClick={handleCreateInvite}
        className="invite-btn-primary"
      >
        Create Invite
      </button>
    </div>
  )
}

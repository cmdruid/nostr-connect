import { useState, useEffect } from 'react'
import { useClientCtx } from '@/demo/context/client.js'

import {
  BaseRequestCard,
  NoteSignatureRequestCard
} from './cards/index.js'

import type { PermissionRequest, PermissionPolicy } from '@/types/index.js'

// Enhanced request interface for UI
interface EnhancedPermRequest {
  id: string
  method: string
  source: string
  content?: unknown
  timestamp: number
  session_origin?: {
    name?: string
    image?: string
    pubkey: string
    url?: string
  }
  request_type: 'base' | 'note_signature'
  status: 'pending' | 'approved' | 'denied'
}

// Transform PermissionRequest to EnhancedPermRequest for UI
function transformRequest(req: PermissionRequest): EnhancedPermRequest {
  const request_type = req.method === 'sign_event' ? 'note_signature' : 'base'
  
  // Extract content from params
  let content: unknown = undefined
  if (req.params && req.params.length > 0) {
    if (req.method === 'sign_event') {
      try {
        content = JSON.parse(req.params[0])
      } catch {
        content = req.params[0]
      }
    } else {
      content = { params: req.params }
    }
  }

  // Extract session origin from session profile
  const session_origin = {
    name: req.session.profile?.name,
    image: req.session.profile?.image,
    pubkey: req.session.pubkey,
    url: req.session.profile?.url
  }

  return {
    id: req.id,
    method: req.method,
    source: req.session.profile?.name || 'Unknown App',
    content,
    timestamp: req.stamp,
    session_origin,
    request_type,
    status: 'pending'
  }
}

export function RequestsView() {
  const ctx = useClientCtx()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [pendingRequests, setPendingRequests] = useState<EnhancedPermRequest[]>([])

  // Update requests when they change
  useEffect(() => {
    const updateRequests = () => {
      const rawRequests = ctx.client.request.queue || []
      setPendingRequests(rawRequests.map(transformRequest))
    }

    // Initial update
    updateRequests()

    // Listen for request changes
    if (ctx.client.request) {
      ctx.client.request.on('prompt',  updateRequests)
      ctx.client.request.on('approve', updateRequests)
      ctx.client.request.on('deny',    updateRequests)

      return () => {
        ctx.client.request.off('prompt',  updateRequests)
        ctx.client.request.off('approve', updateRequests)
        ctx.client.request.off('deny',    updateRequests)
      }
    }
  }, [ctx.client.request])

  const toggleExpanded = (requestId: string) => {
    const newExpanded = new Set(expanded)
    if (newExpanded.has(requestId)) {
      newExpanded.delete(requestId)
    } else {
      newExpanded.add(requestId)
    }
    setExpanded(newExpanded)
  }

  const handleApprove = (requestId: string) => {
    if (!ctx.client.request) return
    const request = ctx.client.request.queue.find((req: PermissionRequest) => req.id === requestId)
    if (request) {
      ctx.client.request.approve(request)
    }
  }

  const handleDeny = (requestId: string) => {
    if (!ctx.client.request) return
    const request = ctx.client.request.queue.find((req: PermissionRequest) => req.id === requestId)
    if (request) {
      ctx.client.request.deny(request, 'denied by user')
    }
  }

  const handleApproveAll = () => {
    if (!ctx.client.request) return
    ctx.client.request.queue.forEach((request: PermissionRequest) => {
      ctx.client.request.approve(request)
    })
  }

  const handleDenyAll = () => {
    if (!ctx.client.request) return
    ctx.client.request.queue.forEach((request: PermissionRequest) => {
      ctx.client.request.deny(request, 'denied by user')
    })
  }

  const handleApproveAllKinds = (kind: number) => {
    if (!ctx.client.request) return
    ctx.client.request.queue
      .filter((req: PermissionRequest) => {
        if (req.method === 'sign_event' && req.params?.[0]) {
          try {
            const event = JSON.parse(req.params[0])
            return event.kind === kind
          } catch {
            return false
          }
        }
        return false
      })
      .forEach((request: PermissionRequest) => {
        const policyChanges: Partial<PermissionPolicy> = {
          kinds: { [kind]: true }
        }
        ctx.client.request.approve(request, policyChanges)
      })
  }

  const handleDenyAllKinds = (kind: number) => {
    if (!ctx.client.request) return
    ctx.client.request.queue
      .filter((req: PermissionRequest) => {
        if (req.method === 'sign_event' && req.params?.[0]) {
          try {
            const event = JSON.parse(req.params[0])
            return event.kind === kind
          } catch {
            return false
          }
        }
        return false
      })
      .forEach((request: PermissionRequest) => {
        const policyChanges: Partial<PermissionPolicy> = {
          kinds: { [kind]: false }
        }
        ctx.client.request.deny(request, 'denied by user', policyChanges)
      })
  }

  // Show locked state if client is locked
  if (ctx.status === 'locked') {
    return (
      <div className="requests-container">
        <h2 className="section-header">Permission Requests</h2>
        <p className="requests-error">Client is locked. Please unlock to view requests.</p>
      </div>
    )
  }

  return (
    <div className="requests-container">
      <h2 className="section-header">Permission Requests</h2>
      
      {/* Show offline warning if client is offline */}
      {ctx.status === 'offline' && (
        <div style={{ 
          backgroundColor: '#ffa500', 
          color: '#000', 
          padding: '10px', 
          borderRadius: '4px', 
          marginBottom: '10px' 
        }}>
          ⚠️ Client is offline. New requests will not appear until connection is restored.
        </div>
      )}

      {/* Pending Requests */}
      <div className="requests-section">
        {pendingRequests.length === 0 ? (
          <p className="requests-empty">No pending requests</p>
        ) : (
          <div className="requests-list">
            {pendingRequests.map((request) => {
              const isExpanded = expanded.has(request.id)
              
              if (request.request_type === 'note_signature') {
                return (
                  <NoteSignatureRequestCard
                    key={request.id}
                    request={request}
                    isExpanded={isExpanded}
                    onToggleExpanded={() => toggleExpanded(request.id)}
                    onApprove={handleApprove}
                    onDeny={handleDeny}
                    onApproveAll={handleApproveAll}
                    onDenyAll={handleDenyAll}
                    onApproveAllKinds={handleApproveAllKinds}
                    onDenyAllKinds={handleDenyAllKinds}
                  />
                )
              } else {
                return (
                  <BaseRequestCard
                    key={request.id}
                    request={request}
                    isExpanded={isExpanded}
                    onToggleExpanded={() => toggleExpanded(request.id)}
                    onApprove={handleApprove}
                    onDeny={handleDeny}
                    onApproveAll={handleApproveAll}
                    onDenyAll={handleDenyAll}
                  />
                )
              }
            })}
          </div>
        )}
      </div>
    </div>
  )
}

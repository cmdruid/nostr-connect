// Note signature request card component
import { RequestCardHeader, RequestCardBody } from './shared.js'
import type { NoteSignatureCardProps, PermRequest } from './types.js'

function NoteSignatureActions({ 
  request, 
  onApprove, 
  onDeny, 
  onApproveAll, 
  onDenyAll,
  onApproveAllKinds,
  onDenyAllKinds
}: {
  request: PermRequest
  onApprove: (id: string) => void
  onDeny: (id: string) => void
  onApproveAll: () => void
  onDenyAll: () => void
  onApproveAllKinds: (kind: number) => void
  onDenyAllKinds: (kind: number) => void
}) {
  // Extract event kind from content if available
  const getEventKind = (): number | null => {
    try {
      if (request.content && typeof request.content === 'object') {
        const content = request.content as any
        if (content.kind !== undefined) return content.kind
        // Try to parse if it's a JSON string
        if (typeof content === 'string') {
          const parsed = JSON.parse(content)
          return parsed.kind || null
        }
      }
      return null
    } catch {
      return null
    }
  }

  const eventKind = getEventKind()

  return (
    <div className="request-actions">
      <div className="request-actions-primary">
        <button
          onClick={() => onApprove(request.id)}
          className="request-btn request-btn-approve"
        >
          Approve
        </button>
        <button
          onClick={() => onDeny(request.id)}
          className="request-btn request-btn-deny"
        >
          Deny
        </button>
      </div>
      <div className="request-actions-bulk">
        <button
          onClick={onApproveAll}
          className="request-btn request-btn-approve-all"
        >
          Approve All
        </button>
        <button
          onClick={onDenyAll}
          className="request-btn request-btn-deny-all"
        >
          Deny All
        </button>
      </div>
      {eventKind !== null && (
        <div className="request-actions-kinds">
          <button
            onClick={() => onApproveAllKinds(eventKind)}
            className="request-btn request-btn-approve-kinds"
          >
            Approve All Kind {eventKind}
          </button>
          <button
            onClick={() => onDenyAllKinds(eventKind)}
            className="request-btn request-btn-deny-kinds"
          >
            Deny All Kind {eventKind}
          </button>
        </div>
      )}
    </div>
  )
}

export function NoteSignatureRequestCard(props: NoteSignatureCardProps) {
  const { request } = props

  return (
    <div className="request-card request-card-signature">
      <RequestCardHeader 
        request={request}
      />
      <RequestCardBody 
        request={request} 
        isExpanded={props.isExpanded} 
        onToggleExpanded={props.onToggleExpanded} 
      />
      <NoteSignatureActions 
        request={request}
        onApprove={props.onApprove}
        onDeny={props.onDeny}
        onApproveAll={props.onApproveAll}
        onDenyAll={props.onDenyAll}
        onApproveAllKinds={props.onApproveAllKinds}
        onDenyAllKinds={props.onDenyAllKinds}
      />
    </div>
  )
} 
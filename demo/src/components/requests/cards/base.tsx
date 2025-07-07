// Base request card component
import { RequestCardHeader, RequestCardBody } from './shared.js'
import type { BaseCardProps, PermRequest } from './types.js'

function BaseRequestActions({ 
  request, 
  onApprove, 
  onDeny, 
  onApproveAll, 
  onDenyAll 
}: {
  request: PermRequest
  onApprove: (id: string) => void
  onDeny: (id: string) => void
  onApproveAll: () => void
  onDenyAll: () => void
}) {
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
    </div>
  )
}

export function BaseRequestCard(props: BaseCardProps) {
  const { request } = props

  return (
    <div className="request-card">
      <RequestCardHeader 
        request={request}
      />
      <RequestCardBody 
        request={request} 
        isExpanded={props.isExpanded} 
        onToggleExpanded={props.onToggleExpanded} 
      />
      <BaseRequestActions 
        request={request}
        onApprove={props.onApprove}
        onDeny={props.onDeny}
        onApproveAll={props.onApproveAll}
        onDenyAll={props.onDenyAll}
      />
    </div>
  )
} 
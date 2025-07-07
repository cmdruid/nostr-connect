// Shared types for request cards

export interface SessionOrigin {
  name?: string
  image?: string
  pubkey: string
  url?: string
}

export interface PermRequest {
  id: string
  method: string
  source: string
  content?: unknown
  timestamp: number
  session_origin?: SessionOrigin
  request_type: 'base' | 'note_signature'
  status: 'pending' | 'approved' | 'denied'
}

export interface BaseCardProps {
  request: PermRequest
  isExpanded: boolean
  onToggleExpanded: () => void
  onApprove: (id: string) => void
  onDeny: (id: string) => void
  onApproveAll: () => void
  onDenyAll: () => void
}

export interface NoteSignatureCardProps extends BaseCardProps {
  onApproveAllKinds: (kind: number) => void
  onDenyAllKinds: (kind: number) => void
} 
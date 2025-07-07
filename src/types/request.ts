import type { SignerSession } from './session.js'

export type PermissionUpdate    = Partial<PermissionPolicy>
export type RequestQueueOptions = Partial<RequestQueueConfig>

export interface PermissionPolicy {
  methods : Record<string, boolean>
  kinds   : Record<string, boolean>
}

export interface PermissionRequest {
  id      : string
  method  : string
  params  : string[] | undefined
  session : SignerSession
  stamp   : number
}

export interface RequestQueueConfig {
  queue_timeout : number
}

import type { SessionToken } from './session.js'

export type PermissionUpdate = Partial<PermissionPolicy>

export interface PermissionPolicy {
  methods : Record<string, boolean>
  kinds   : Record<number, boolean>
}

export interface PermissionRequest {
  id      : string
  method  : string
  params  : string[] | undefined
  session : SessionToken
  stamp   : number
}

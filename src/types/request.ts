import type { SessionToken } from '@/types/session.js'

export type PermissionUpdate = Partial<PermissionPolicy>

export interface PermissionRequest {
  id      : string
  method  : string
  params  : any[]
  session : SessionToken
  stamp   : number
}

export interface PermissionPolicy {
  methods : Record<string, boolean>
  kinds   : Record<number, boolean>
}

export interface RequestEventMap extends Record<string, any[]> {
  request : [ PermissionRequest ]
  approve : [ PermissionRequest ]
  deny    : [ PermissionRequest, string ]
  error   : [ PermissionRequest, string ]
}
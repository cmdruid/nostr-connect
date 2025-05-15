export interface EventConfig {
  created_at? : number
  kind        : number
  tags        : string[][]
}

export interface EventFilter {
  ids     ?: string[]
  authors ?: string[]
  kinds   ?: number[]
  since   ?: number
  until   ?: number
  limit   ?: number
  [ key : string ] : any | undefined
}

export interface EventTemplate {
  content    : string
  created_at : number
  kind       : number
  pubkey     : string
  tags       : string[][]
}

export interface UnsignedEvent extends EventTemplate {
  id : string
}

export interface SignedEvent extends UnsignedEvent {
  sig : string
}

export interface EncryptedEvent extends SignedEvent {
  payload : string
}

import { SignedEvent } from './event.js'

export type MessageTemplate = RequestTemplate | AcceptTemplate | RejectTemplate
export type ResponseMessage = AcceptMessage   | RejectMessage
export type SignedMessage   = RequestMessage  | ResponseMessage

export interface MessageConfig {
  created_at? : number
  kind        : number
  tags?       : string[][]
}

export interface RequestTemplate {
  id      : string
  method  : string
  params? : string[]
}

export interface AcceptTemplate {
  id     : string
  result : string
}

export interface RejectTemplate {
  id    : string
  error : string
}

export interface RequestMessage extends RequestTemplate {
  env    : SignedEvent
  id     : string
  params : string[]
  type   : 'request'
}

export interface AcceptMessage extends AcceptTemplate {
  env  : SignedEvent
  type : 'accept'
}

export interface RejectMessage extends RejectTemplate {
  env  : SignedEvent
  type : 'reject'
}

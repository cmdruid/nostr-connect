import { SignedEvent } from './event.js'

export type SignedMessage   = RequestMessage  | ResponseMessage  | RejectMessage
export type MessageTemplate = RequestTemplate | ResponseTemplate | RejectTemplate
export type MessageType     = 'request' | 'response' | 'reject'

export interface BaseMessage {
  id   : string
  type : MessageType
}

export interface RequestTemplate extends BaseMessage {
  method : string
  params : string[]
  type   : 'request'
}

export interface ResponseTemplate extends BaseMessage {
  result : string
  type   : 'response'
}

export interface RejectTemplate extends BaseMessage {
  error : string
  type  : 'reject'
}

export interface RequestMessage extends RequestTemplate {
  env : SignedEvent
}

export interface ResponseMessage extends ResponseTemplate {
  env : SignedEvent
}

export interface RejectMessage extends RejectTemplate {
  env : SignedEvent
}

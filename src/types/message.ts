import { SignedEvent } from './event.js'

export type MessageTemplate = RequestTemplate | AcceptTemplate | RejectTemplate
export type ResponseMessage = AcceptMessage   | RejectMessage
export type SignedMessage   = RequestMessage  | ResponseMessage

export interface BaseMessage {
  id : string
}

export interface RequestTemplate extends BaseMessage {
  method  : string
  params? : string[]
}

export interface AcceptTemplate extends BaseMessage {
  result : string
}

export interface RejectTemplate extends BaseMessage {
  error : string
}

export interface RequestMessage extends RequestTemplate {
  env    : SignedEvent
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

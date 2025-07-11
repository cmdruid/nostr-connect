import { EventEmitter } from '@/class/emitter.js'

import {
  check_perm_request,
  update_policy
} from '@/lib/perms.js'

import type {
  PermissionPolicy,
  PermissionRequest,
  RequestEventMap,
  SignerSession
} from '@/types/index.js'
import { NostrSocket } from './socket.js'
import { create_accept_msg, create_reject_msg } from '@/lib/message.js'

const DEFAULT_TIMEOUT : number = 30

export class RequestQueue extends EventEmitter<RequestEventMap> {
  private readonly _queue   : Map<string, PermissionRequest> = new Map()
  private readonly _socket  : NostrSocket
  private readonly _timers  : Map<string, NodeJS.Timeout>    = new Map()
  private readonly _timeout : number

  constructor (
    socket  : NostrSocket,
    timeout : number = DEFAULT_TIMEOUT
  ) {
    super()
    this._socket  = socket
    this._timeout = timeout
  }

  get queue () : PermissionRequest[] {
    return Array.from(this._queue.values())
  }

  get timeout () : number {
    return this._timeout
  }

  handler (req : PermissionRequest) {
    // Try to handle the permission request.
    try {
      // Check the permission request.
      const result = check_perm_request(req)
      // If the policy check returns true,
      if (result === false) {
        // Deny the request.
        this.deny(req, 'permission denied via policy check')
      // If the policy check returns null,
      } else {
        // Add the request to the queue.
        this._queue.set(req.id, req)
        // Get the timeout in milliseconds.
        const timeout = this._timeout * 1000
        // Add a timer to auto-reject the request.
        const timer = setTimeout(() => { this.deny(req, 'request timed out') }, timeout)
        // Add the timer to the timers map.
        this._timers.set(req.id, timer)
        // If the policy check returns true,
        if (result === true) {
          // Emit the approval event on the bus.
          this.emit('approve', req)
        // If the policy check returns null,
        } else {
          // Emit the request event on the bus.
          this.emit('prompt', req)
        }
      }
    } catch (err) {
      // Deny the request.
      this.deny(req, 'client failed to handle request')
      // Emit the error event on the bus.
      this.emit('error', err)
    }
  }

  _remove (req : PermissionRequest) {
    // Remove the request from the queue.
    this._queue.delete(req.id)
    // Get the timer from the timers map.
    const timer = this._timers.get(req.id)
    // If the timer is found, clear it.
    if (timer) clearTimeout(timer)
    // Remove the timer from the timers map.
    this._timers.delete(req.id)
  }

  _update (session : SignerSession, changes : Partial<PermissionPolicy>) {
    // Create a new policy with the changes.
    const policy = update_policy(session.policy, changes)
    // Update the session with the new policy.
    this.emit('update', { ...session, policy })
  }

  approve (
    req      : PermissionRequest,
    changes? : Partial<PermissionPolicy>
  ) {
    // Remove the request from the queue.
    this._remove(req)
    // If there are changes, update the policy.
    if (changes) this._update(req.session, changes)
    // Emit the approval on the bus.
    this.emit('approve', req)
  }

  deny (
    req      : PermissionRequest,
    reason   : string,
    changes? : Partial<PermissionPolicy>
  ) {
    // Remove the request from the queue.
    this._remove(req)
    // If there are changes, update the policy.
    if (changes) this._update(req.session, changes)
    // Emit the denial on the bus.
    this.emit('deny', req, reason)
  }

  resolve (req : PermissionRequest, result : string) {
    // Create the accept message.
    const msg = create_accept_msg({ id : req.id, result })
    // Accept the request.
    this._socket.send(msg, req.session.pubkey)
    // Emit the resolve event on the bus.
    this.emit('resolve', req, result)
  }

  reject (req : PermissionRequest, reason : string) {
    // Create the reject message.
    const msg = create_reject_msg({ id : req.id, error : reason })
    // Reject the request.
    this._socket.send(msg, req.session.pubkey)
    // Emit the reject event on the bus.
    this.emit('reject', req, reason)
  }

}
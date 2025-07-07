import { EventEmitter }   from '@/class/emitter.js'
import { NostrSocket }    from '@/class/socket.js'
import { parse_error }    from '@vbyte/micro-lib/util'

import {
  check_permission_request,
  update_policy
} from '@/lib/perms.js'

import type {
  PermissionPolicy,
  PermissionRequest,
  RequestEventMap,
  SignerSession,
  RequestQueueConfig,
  RequestQueueOptions
} from '@/types/index.js'

const DEFAULT_CONFIG : () => RequestQueueConfig = () => {
  return {
    queue_timeout : 30,
  }
}

export class RequestQueue extends EventEmitter<RequestEventMap> {
  private readonly _config  : RequestQueueConfig
  private readonly _queue   : Map<string, PermissionRequest> = new Map()
  private readonly _socket  : NostrSocket
  private readonly _timers  : Map<string, NodeJS.Timeout>    = new Map()

  constructor (
    socket  : NostrSocket,
    options : RequestQueueOptions = {}
  ) {
    super()
    // Set the config.
    this._config  = { ...DEFAULT_CONFIG(), ...options }
    // Set the client.
    this._socket  = socket
  }

  get config () : Record<string, any> {
    return this._config
  }

  get queue () : PermissionRequest[] {
    return Array.from(this._queue.values())
  }

  handler (req : PermissionRequest) {
    // Try to handle the permission request.
    try {
      // Check the permission request.
      const result = check_permission_request(req)
      // If the policy check returns true,
      if (result === false) {
        // Deny the request.
        this.deny(req, 'permission denied via policy check')
      // If the policy check returns null,
      } else {
        // Add the request to the queue.
        this._queue.set(req.id, req)
        // Get the timeout in milliseconds.
        const timeout = this.config.queue_timeout * 1000
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
      this.emit('error', req,  parse_error(err))
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
    result   : string,
    changes? : Partial<PermissionPolicy>
  ) {
    // Remove the request from the queue.
    this._remove(req)
    // Send a response to the client.
    this._socket.accept(req.id, req.session.pubkey, result)
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
    // Get the pubkey from the request.
    const pubkey = req.session.pubkey
    // Remove the request from the queue.
    this._remove(req)
    // Send a rejection response to the client.
    this._socket.reject(req.id, pubkey, reason)
    // If there are changes, update the policy.
    if (changes) this._update(req.session, changes)
    // Emit the denial on the bus.
    this.emit('deny', req, reason)
  }

}
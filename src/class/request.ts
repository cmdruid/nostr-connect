import { EventEmitter }   from '@/class/emitter.js'
import { NostrClient }    from '@/class/client.js'
import { SessionManager } from '@/class/session.js'
import { parse_error }    from '@vbyte/micro-lib/util'

import {
  check_permission_request,
  create_permission_request
} from '@/lib/perms.js'

import type {
  PermissionPolicy,
  PermissionRequest,
  RequestEventMap,
  RequestMessage,
  SessionToken
} from '@/types/index.js'

const DEFAULT_CONFIG : () => Record<string, any> = () => {
  return {
    timeout : 30,
  }
}

export class RequestManager extends EventEmitter<RequestEventMap> {
  private readonly _config  : Record<string, any>
  private readonly _client  : NostrClient
  private readonly _queue   : Map<string, PermissionRequest> = new Map()
  private readonly _session : SessionManager
  private readonly _timers  : Map<string, NodeJS.Timeout>    = new Map()

  constructor (
    client  : NostrClient,
    session : SessionManager,
    options : Record<string, any> = {}
  ) {
    super()
    // Set the config.
    this._config  = { ...DEFAULT_CONFIG(), ...options }
    // Set the client.
    this._client  = client
    // Set the session manager.
    this._session = session
    // Handle the request messages.
    this._session.on('request', this._handler.bind(this))
  }

  get config () : Record<string, any> {
    return this._config
  }

  get queue () : PermissionRequest[] {
    return Array.from(this._queue.values())
  }

  _handler (req : RequestMessage, token : SessionToken) {
    // If the request is not a request, return early.
    if (req.type !== 'request') return
    // If the token is not found, return early.
    if (!token) return
    // Create a permission request.
    const perm_req = create_permission_request(req, token)
    // Try to create a permission request.
    try {
      // Check the permission request.
      const result = check_permission_request(perm_req)
      // If the policy check returns true,
      if (result === true) {
        // Approve the request.
        this.approve(perm_req)
      // If the policy check returns false,
      } else if (result === false) {
        // Deny the request.
        this.deny(perm_req, 'permission denied')
      // If the policy check returns null,
      } else {
        // Add the request to the queue.
        this._queue.set(req.id, perm_req)
        // Get the timeout in milliseconds.
        const timeout = this.config.timeout * 1000
        // Add a timer to auto-reject the request.
        const timer = setTimeout(() => { this.deny(perm_req, 'request timed out') }, timeout)
        // Add the timer to the timers map.
        this._timers.set(req.id, timer)
        // Emit the request event on the bus.
        this.emit('request', perm_req)
      }
    } catch (err) {
      // Deny the request.
      this.deny(perm_req, 'failed to handle request')
      // Emit the error event on the bus.
      this.emit('error', perm_req,  parse_error(err))
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

  _update (session : SessionToken, changes : Partial<PermissionPolicy>) {
    // Create a new policy with the changes.
    const policy = { ...session.policy, ...changes }
    // Update the session with the new policy.
    this._session.update({ ...session, policy })
  }

  approve (
    req      : PermissionRequest,
    changes? : Partial<PermissionPolicy>
  ) {
    // If there are changes, update the policy.
    if (changes) this._update(req.session, changes)
    // Remove the request from the queue.
    this._remove(req)
    // Emit the approval on the bus.
    this.emit('approved', req)
  }

  deny (
    req      : PermissionRequest,
    reason   : string,
    changes? : Partial<PermissionPolicy>
  ) {
    // Get the pubkey from the request.
    const pubkey = req.session.pubkey
    // Send a rejection response to the client.
    this._client.reject(req.id, pubkey, reason)
    // If there are changes, update the policy.
    if (changes) this._update(req.session, changes)
    // Remove the request from the queue.
    this._remove(req)
    // Emit the denial on the bus.
    this.emit('denied', req)
  }

}
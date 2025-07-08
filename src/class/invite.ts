import { EventEmitter } from '@/class/emitter.js'
import { NostrSocket }  from '@/class/socket.js'
import { create_token } from '@/lib/invite.js'

import type {
  ResponseMessage,
  InviteEventMap,
  InviteToken,
  InviteConfig,
  JoinEvent
} from '@/types/index.js'

const DEFAULT_TIMEOUT = 30

export class InviteManager extends EventEmitter<InviteEventMap> {

  private readonly _pending : Set<string> = new Set()
  private readonly _socket  : NostrSocket
  private readonly _timers  : Map<string, NodeJS.Timeout> = new Map()
  private readonly _timeout : number

  constructor (
    socket  : NostrSocket,
    timeout : number = DEFAULT_TIMEOUT
  ) {
    super()
    // Set the socket.
    this._socket  = socket
    // Set the timeout.
    this._timeout = timeout
  }

  get pending () : string[] {
    return Array.from(this._pending)
  }

  async handler (msg : ResponseMessage) {
    try {
      // If the response is not an accept, return early.
      if (msg.type !== 'accept') return
      // If the invite is not found, return early.
      if (this._pending.has(msg.result)) {
        // Create a request for the public key.
        const req = { method : 'get_public_key' }
        // Request the public key from the device.
        const res = await this._socket.request(req, msg.env.pubkey)
        // If the response is not an accept, return early.
        if (res.type !== 'accept') return
        // Join the device to the agent. 
        this._join(msg.result, res.result)
      }
    } catch (err) {
      this.emit('error', err)
    }
  }

  _create (token : InviteToken) {
    // Add the token to the invites map.
    this._pending.add(token.secret)
    // Set a timeout method to delete the token from the session manager.
    const timer = setTimeout(() => {
      // Delete the token from the session map.
      this._pending.delete(token.secret)
      this._timers.delete(token.secret)
      // Emit the token cancellation to the client.
      this.emit('expired', token.secret)
    }, this._timeout * 1000)
    // Add the timer to the timers map.
    this._timers.set(token.secret, timer)
    // Emit the invitation to the client.
    this.emit('invite', token)
  }

  _join (secret : string, pubkey : string) {
    // Delete the invite from the invites map.
    this._pending.delete(secret)
    // Delete the timer from the timers map.
    this._timers.delete(secret)
    // Emit the invitation to the client.
    this.emit('join', { pubkey, secret })
  }

  create (options : Partial<InviteConfig> = {}) : InviteToken {
    // Create a new connection token.
    const token = create_token(this._socket.pubkey, options)
    // Register the token with the invite manager.
    this._create(token)
    // Return the connection token with the secret.
    return token
  }

  /**
   * Cancels a pending inviation for a session
   * @param challenge - The challenge of the invitation to cancel.
   */
  cancel (challenge : string) {
    if (this._pending.delete(challenge)) {
      this._timers.delete(challenge)
      this.emit('cancel', challenge)
    }
  }

  listen (token : InviteToken) : Promise<JoinEvent> {
    // Define the connection timeout.
    const timeout = this._timeout * 1000
    // Subscribe to the relays.
    this._socket.subscribe(token.relays)
    // Return a promise to resolve the session.
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        clearTimeout(timer)
        reject(new Error('invite timeout'))
      }, timeout)
      this.within('join', (event) => {
        if (event.secret === token.secret) {
          clearTimeout(timer)
          resolve(event)
        }
      }, timeout)
    })
  }
}

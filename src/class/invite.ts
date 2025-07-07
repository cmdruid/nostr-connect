import { Buff }         from '@vbyte/buff'
import { EventEmitter } from '@/class/emitter.js'
import { NostrSocket }  from '@/class/socket.js'

import type {
  ResponseMessage,
  InviteEventMap,
  InviteToken,
  InviteConfig
} from '@/types/index.js'

const DEFAULT_TIMEOUT = 30

export class InviteManager extends EventEmitter<InviteEventMap> {

  private readonly _invites : Set<string> = new Set()
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

  get invites () : string[] {
    return Array.from(this._invites)
  }

  async handler (msg : ResponseMessage) {
    try {
      // If the response is not an accept, return early.
      if (msg.type !== 'accept') return
      // If the invite is not found, return early.
      if (this._invites.has(msg.result)) {
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
    this._invites.add(token.secret)
    // Set a timeout method to delete the token from the session manager.
    const timer = setTimeout(() => {
      // Delete the token from the session map.
      this._invites.delete(token.secret)
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
    this._invites.delete(secret)
    // Delete the timer from the timers map.
    this._timers.delete(secret)
    // Emit the invitation to the client.
    this.emit('join', { pubkey, secret })
  }

  create (config : InviteConfig) : InviteToken {
    // Create a new connection token.
    const token : InviteToken = {
      policy  : config.host_policy,
      profile : config.host_profile,
      pubkey  : this._socket.pubkey,
      relays  : this._socket.relays,
      secret  : Buff.random(32).hex
    }
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
    if (this._invites.delete(challenge)) {
      this._timers.delete(challenge)
      this.emit('cancel', challenge)
    }
  }
}

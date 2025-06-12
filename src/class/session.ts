import { SessionClient } from '@/class/client.js'
import { EventEmitter }  from '@/class/emitter.js'
import { now }           from '@/util/index.js'
import { REQ_METHOD }    from '@/const.js'

import {
  PublishedEvent,
  SessionToken,
  RequestMessage,
  ConnectionToken,
  SessionEventMap
} from '@/types/index.js'

export class SessionManager extends EventEmitter<SessionEventMap> {
  private readonly _client  : SessionClient

  private readonly _active  : Map<string, SessionToken>   = new Map()
  private readonly _pending : Map<string, SessionToken>   = new Map()
  private readonly _timers  : Map<string, NodeJS.Timeout> = new Map()

  constructor (
    client   : SessionClient,
    sessions : SessionToken[] = []
  ) {
    super()
    this._client = client

    for (const session of sessions) {
      // Add the token to the active session map.
      this._active.set(session.pubkey, session)
    }
  }

  get active () : SessionToken[] {
    return Array.from(this._active.values())
  }

  get methods () : string[] {
    return [
      REQ_METHOD.CONNECT,
      REQ_METHOD.GET_PUBKEY
    ]
  }

  get pending () : SessionToken[] {
    return Array.from(this._pending.values())
  }

  _activate (token : SessionToken) : void {
    // Delete the token from the pending session map.
    this._pending.delete(token.pubkey)
    // Delete the timer from the timers map.
    this._timers.delete(token.pubkey)
    // Add the token to the active session map.
    this._active.set(token.pubkey, token)
    // Emit the token activation to the client.
    this.emit('activated', token)
  }

  _create (
    token    : SessionToken,
    timeout? : number
  ) : void {
    // Set the timeout for the token.
    timeout ??= this._client.config.pending_timeout
    // If the token is already registered, return early.
    if (this._pending.has(token.pubkey)) return
    // Add the token to the pending session map.
    this._pending.set(token.pubkey, token)
    // Set a timeout method to delete the token from the session manager.
    const timer = setTimeout(() => {
      // Delete the token from the session map.
      this._pending.delete(token.pubkey)
      this._timers.delete(token.pubkey)
      // Emit the token cancellation to the client.
      this.emit('cancelled', token)
    }, timeout * 1000)
    // Add the timer to the timers map.
    this._timers.set(token.pubkey, timer)
  }

  /**
   * Handles a pubkey request message from the client.
   * @param req - The request message to handle.
   * @returns The response from the client.
   */
  async handler (req : RequestMessage) : Promise<void> {
    // Get the client's public key.
    const pubkey = this._client.pubkey
    // Get the sender's public key.
    const sender = req.env.pubkey
    // If the token is found in the active session map,
    if (this._pending.has(sender)) {
      // Check the pending session map.
      const token = this._pending.get(sender)
      // If the token is not found, return early.
      if (!token) return
      // Activate the token.
      this._activate(token)
    }
    const token = this._active.get(sender)
    // If the token is not found, return early.
    if (!token) return
    //
    if (req.method === REQ_METHOD.CONNECT) {
      // Send a response to the client.
      this._client.respond(req.id, sender, 'ack', token.relays)
    } else if (req.method === REQ_METHOD.GET_PUBKEY) {
      // Send a response to the client.
      this._client.respond(req.id, sender, pubkey, token.relays)
    } else {
      // Send a response to the client.
      this._client.reject(req.id, sender, 'invalid_method')
    }
  }

  get (pubkey : string) : SessionToken | undefined {
    return this._active.get(pubkey)
  }

  /**
   * Registers a connection token with the client.
   * @param connect_tkn - The connection token to register.
   * @returns The response from the client.
   */
  async register (connect_tkn : ConnectionToken) : Promise<PublishedEvent> {
    // Unpack the connection token.
    const { secret, ...tkn } = connect_tkn
    // If the client has missing relays,
    if (has_missing_relays(this._client, tkn.relays)) {
      // Update our subscription list.
      await this._client.subscribe(tkn.relays)
    }
    // Send a response to the issuing client.
    const res = await this._client.respond(secret, tkn.pubkey, secret, tkn.relays)
    // If the message is not accepted, return early.
    if (!res.ok) return res
    // Create the session token.
    const token = { ...tkn, created_at: now() }
    // Add the session token to the pending session map.
    this._pending.set(token.pubkey, token)
    // Emit the pending session token to the client.
    this.emit('pending', token)
    // Return the response.
    return res
  }

  async update (session : SessionToken) : Promise<void> {
    // Get the session token from the active session map.
    const token = this._active.get(session.pubkey)
    // If the session token is not found, return early.
    if (!token) return
    // Update the session token.
    this._active.set(session.pubkey, session)
    // Emit the session update to the client.
    this.emit('updated', session)
  }

  /**
   * Cancels a session token from the pending session map.
   * @param pubkey - The pubkey of the session token to delete.
   * @returns True if the session token was deleted, false otherwise.
   */
  cancel (pubkey : string) {
    const token = this._pending.get(pubkey)
    if (token) {
      this._pending.delete(pubkey)
      this._timers.delete(pubkey)
      this.emit('cancelled', token)
    }
  }

  /**
   * Deletes a session token from the active session map.
   * @param pubkey - The pubkey of the session token to delete.
   * @returns True if the session token was deleted, false otherwise.
   */
  revoke (pubkey : string) {
    const token = this._active.get(pubkey)
    if (token) {
      this._active.delete(pubkey)
      this.emit('revoked', token)
    }
  }

  /**
   * Clears all sessions from the session manager.
   */
  clear () : void {
    this._active.clear()
    this._pending.clear()
    this._timers.clear()
    this.emit('cleared')
  }
}

function has_missing_relays (
  client : SessionClient,
  relays : string[],
) : boolean {
  for (const relay of relays) {
    if (!client.relays.includes(relay)) {
      return true
    }
  }
  return false
}
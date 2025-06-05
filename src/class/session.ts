import { NIP46Client }    from '@/class/client.js'
import { gen_message_id } from '@/lib/util.js'

import {
  PublishedEvent,
  SessionToken,
  RequestMessage,
  ConnectionToken
} from '@/types/index.js'

export class SessionManager {
  private readonly _client  : NIP46Client

  private readonly _active  : Map<string, SessionToken>   = new Map()
  private readonly _issued  : Map<string, SessionToken>   = new Map()
  private readonly _pending : Map<string, SessionToken>   = new Map()
  private readonly _timers  : Map<string, NodeJS.Timeout> = new Map()

  constructor (client : NIP46Client) {
    this._client = client
  }

  get active () : Map<string, SessionToken> {
    return this._active
  }

  get pending () : Map<string, SessionToken> {
    return this._pending
  }

  get issued () : Map<string, SessionToken> {
    return this._issued
  }

  get timers () : Map<string, NodeJS.Timeout> {
    return this._timers
  }

  _activate (token : SessionToken) : void {
    // If the token secret is not valid, return early.
    // Delete the token from the pending session map.
    this._pending.delete(token.pubkey)
    // Delete the token from the issued session map.
    this._issued.delete(token.secret)
    // Delete the expiration timer from the timers map.
    this._timers.delete(token.secret)
    // Add the token to the active session map.
    this._active.set(token.pubkey, token)
    // Emit the token activation to the client.
    this._client.emit('activated', token)
  }

  _issue (
    secret : string,
    token  : SessionToken
  ) : void {
    // If the token is already registered, return early.
    if (this._issued.has(secret)) return
    // Add the token to the pending session map.
    this._issued.set(secret, token)
    // Set the timeout for the token.
    const timeout = this._client.config.req_timeout * 1000
    // Set a timeout method to delete the token from the session manager.
    const timer = setTimeout(() => {
      // Delete the token from the session map.
      this._issued.delete(secret)
      this._pending.delete(secret)
      this._timers.delete(secret)
    }, timeout)
    // Add the timer to the timers map.
    this._timers.set(secret, timer)
  }

  /**
   * Activates a session token.
   * @param token - The session token to activate.
   */
  async handle_pubkey (req : RequestMessage) : Promise<void> {
    // Get the client's public key.
    const pubkey = this._client.pubkey
    // Get the sender's public key.
    const sender = req.env.pubkey
    // If the token is found in the active session map,
    if (this.active.has(sender)) {
      // Send a response to the client.
      this._client.respond(req.id, sender, pubkey)
    } else {
      // Check the pending session map.
      const token = this.pending.get(sender)
      // If the token is not found, return early.
      if (!token) return
      // Send a response to the client.
      this._client.respond(req.id, sender, pubkey)
      // Activate the token.
      this._activate(token)
    }
  }

  /**
   * Handles a request message from the client.
   * @param req - The request message to handle.
   * @returns The response from the client.
   */
  async handle_connect (req : RequestMessage) : Promise<void> {
    // Get the sender's public key.
    const sender = req.env.pubkey
    // Get the pubkey from the request parameters.
    const pubkey = req.params.at(0)
    // Get the secret from the request parameters.
    const secret = req.params.at(1)
    // If no pubkey orsecret is provided, return early.
    if (!pubkey || !secret) return
    // Get the token from the pending session map.
    const token = this.issued.get(secret)
    // If no token is found, return early.
    if (!token) return
    // If the token pubkey is not valid, return early.
    if (token.pubkey !== pubkey) return
    // If the token secret is not valid, return early.
    if (token.secret !== secret) return
    // Send the response message to the client.
    const res = await this._client.respond(req.id, sender, 'ack')
    // If the message is not accepted, return early.
    if (!res.ok) return
    // Add the token to the pending session map.
    this._pending.set(sender, { ...token, pubkey: sender })
    // Emit the token authorization to the client.
    this._client.emit('pending', token)
  }

  /**
   * Generates a new session token, and registers it with the client.
   * @param options - The options for the session token.
   * @returns The session token.
   */
  generate (options : Partial<SessionToken> = {}) : SessionToken {
    // Define the client pubkey.
    const pubkey = this._client.pubkey
    // Define the client relays.
    const relays = this._client.relays
    // Generate a unique secret.
    const secret = gen_message_id()
    // Create the session token.
    const token  = { ...options, pubkey, relays, secret }
    // Register the token with the client.
    this._issue(secret, token)
    // Emit the token registration to the client.
    this._client.emit('issued', token)
    // Return the session token.
    return token
  }

  /**
   * Activates a connection token with the client.
   * @param token - The session token to activate.
   * @returns The response from the client.
   */
  async register (connect_token : ConnectionToken) : Promise<PublishedEvent> {
    // Get the session token from the connection token.
    const { id, ...token } = connect_token
    // Send the response to the client.
    const res = await this._client.respond(id, token.pubkey, token.secret)
    // If the message is not accepted, return early.
    if (!res.ok) return res
    // Add the token to the active session map.
    this._pending.set(token.pubkey, token)
    // Emit the token authorization to the client.
    this._client.emit('pending', token)
    // Return the response.
    return res
  }

  /**
   * Deletes a session token from the active session map.
   * @param pubkey - The pubkey of the session token to delete.
   * @returns True if the session token was deleted, false otherwise.
   */
  delete (pubkey : string) : boolean {
    return this._active.delete(pubkey)
  }

  /**
   * Clears all sessions from the session manager.
   */
  clear () : void {
    this._active.clear()
    this._issued.clear()
    this._pending.clear()
    this._timers.clear()
  }
}

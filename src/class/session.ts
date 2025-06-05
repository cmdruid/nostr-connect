import { NostrClient } from '@/class/client.js'
import { gen_message_id } from '@/lib/util.js'

import {
  PublishedEvent,
  SessionToken,
  RequestMessage,
  ConnectionToken
} from '@/types/index.js'

export class SessionManager {
  private readonly _client  : NostrClient

  private readonly _active  : Map<string, SessionToken>   = new Map()
  private readonly _pending : Map<string, SessionToken>   = new Map()
  private readonly _timers  : Map<string, NodeJS.Timeout> = new Map()

  constructor (client : NostrClient) {
    this._client = client
  }

  get active () : Map<string, SessionToken> {
    return this._active
  }

  get pending () : Map<string, SessionToken> {
    return this._pending
  }

  get timers () : Map<string, NodeJS.Timeout> {
    return this._timers
  }

  _register (
    secret : string,
    token  : SessionToken
  ) : void {
    // Add the token to the pending session map.
    this._pending.set(secret, token)
    // Set the timeout for the token.
    const timeout = this._client.config.req_timeout * 1000
    // Set a timeout method to delete the token from the session manager.
    const timer = setTimeout(() => {
      this._pending.delete(secret)
      this._timers.delete(secret)
    }, timeout)
    // Add the timer to the timers map.
    this._timers.set(secret, timer)
  }

  /**
   * Handles a request message from the client.
   * @param req - The request message to handle.
   * @returns The response from the client.
   */
  async handler (req : RequestMessage) : Promise<void> {
    // Get the pubkey from the request parameters.
    const pubkey = req.params.at(0)
    // If no pubkey is provided, return early.
    if (!pubkey) return
    // Get the secret from the request parameters.
    const secret = req.params.at(1)
    // If no secret is provided, return early.
    if (!secret) return
    // Get the token from the pending session map.
    const token = this.pending.get(secret)
    // If no token is found, return early.
    if (!token) return
    // Send the response message to the client.
    const res = await this._client.respond(req.id, pubkey, token.secret)
    // If the message is not accepted, return early.
    if (!res.ok) return
    // Delete the token from the pending session map.
    this._pending.delete(secret)
    // Delete the expiration timer from the timers map.
    this._timers.delete(secret)
    // Add the token to the active session map.
    this._active.set(pubkey, { ...token, pubkey })
    // Emit the token authorization to the client.
    this._client.emit('activate', token)
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
    this._register(secret, token)
    // Emit the token registration to the client.
    this._client.emit('register', token)
    // Return the session token.
    return token
  }

  /**
   * Activates a connection token with the client.
   * @param token - The session token to activate.
   * @returns The response from the client.
   */
  async activate (connect_token : ConnectionToken) : Promise<PublishedEvent> {
    // Get the session token from the connection token.
    const { id, ...token } = connect_token
    // Send the response to the client.
    const res = await this._client.respond(id, token.pubkey, token.secret)
    // If the message is not accepted, return early.
    if (!res.ok) return res
    // Add the token to the active session map.
    this._active.set(token.pubkey, token)
    // Emit the token authorization to the client.
    this._client.emit('activate', token)
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
    this._pending.clear()
  }
}

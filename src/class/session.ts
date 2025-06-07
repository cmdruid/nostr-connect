import { NIP46Client }    from '@/class/client.js'
import { EventEmitter }   from '@/class/emitter.js'
import { gen_message_id } from '@/lib/util.js'
import { now }            from '@/util/index.js'

import {
  PublishedEvent,
  SessionToken,
  RequestMessage,
  ConnectionToken,
  InviteToken,
  SessionEventMap,
  InviteEntry
} from '@/types/index.js'

export class SessionManager extends EventEmitter<SessionEventMap> {
  private readonly _client  : NIP46Client

  private readonly _active  : Map<string, SessionToken>   = new Map()
  private readonly _invites : Map<string, SessionToken>   = new Map()
  private readonly _pending : Map<string, SessionToken>   = new Map()
  private readonly _timers  : Map<string, NodeJS.Timeout> = new Map()

  constructor (
    client   : NIP46Client,
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

  get pending () : SessionToken[] {
    return Array.from(this._pending.values())
  }

  get invites () : InviteEntry[] {
    return Array.from(this._invites.entries())
  }

  _activate_session (token : SessionToken) : void {
    // Delete the token from the pending session map.
    this._pending.delete(token.pubkey)
    // Delete the timer from the timers map.
    this._timers.delete(token.pubkey)
    // Add the token to the active session map.
    this._active.set(token.pubkey, token)
    // Emit the token activation to the client.
    this.emit('activated', token)
  }

  _create_invite (
    secret   : string,
    token    : SessionToken,
    timeout? : number
  ) : void {
    // Set the timeout for the token.
    timeout ??= this._client.config.invite_timeout
    // If the token is already registered, return early.
    if (this._invites.has(secret)) return
    // Add the token to the pending session map.
    this._invites.set(secret, token)
    // Set a timeout method to delete the token from the session manager.
    const timer = setTimeout(() => {
      // Delete the token from the session map.
      this._invites.delete(secret)
      this._timers.delete(secret)
      // Emit the token cancellation to the client.
      this.emit('cancelled', token)
    }, timeout * 1000)
    // Add the timer to the timers map.
    this._timers.set(secret, timer)
  }

  _create_session (
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
      this.emit('revoked', token)
    }, timeout * 1000)
    // Add the timer to the timers map.
    this._timers.set(token.pubkey, timer)
  }

  /**
   * Handles a connection request message from the client.
   * @param req - The request message to handle.
   * @returns The response from the client.
   */
  async handle_connect_req (req : RequestMessage) : Promise<void> {
    // Get the sender's public key.
    const sender = req.env.pubkey
    // Get the pubkey from the request parameters.
    const pubkey = req.params.at(0)
    // Get the secret from the request parameters.
    const secret = req.params.at(1)
    // If no pubkey orsecret is provided, return early.
    if (!pubkey || !secret) return
    // Get the token from the pending session map.
    const invite = this._invites.get(secret)
    // If no token is found, return early.
    if (!invite) return
    // If the token pubkey is not valid, return early.
    if (invite.pubkey !== pubkey) return
    // Send the response message to the client.
    const res = await this._client.respond(req.id, sender, 'ack', invite.relays)
    // If the message is not accepted, return early.
    if (!res.ok) return
    // Delete the token from the issued session map.
    this._invites.delete(secret)
    // Delete the timer from the timers map.
    this._timers.delete(secret)
    // Create the session token.
    const session = { ...invite, pubkey: sender }
    // Add the token to the pending session map.
    this._create_session(session)
    // Emit the token authorization to the client.
    this.emit('pending', session)
  }

  /**
   * Handles a pubkey request message from the client.
   * @param req - The request message to handle.
   * @returns The response from the client.
   */
  async handle_pubkey_req (req : RequestMessage) : Promise<void> {
    // Get the client's public key.
    const pubkey = this._client.pubkey
    // Get the sender's public key.
    const sender = req.env.pubkey
    // If the token is found in the active session map,
    if (this._active.has(sender)) {
      // Send a response to the client.
      this._client.respond(req.id, sender, pubkey)
    } else {
      // Check the pending session map.
      const token = this._pending.get(sender)
      // If the token is not found, return early.
      if (!token) return
      // Send a response to the client.
      this._client.respond(req.id, sender, pubkey, token.relays)
      // Activate the token.
      this._activate_session(token)
    }
  }

  /**
   * Generates a new invite token, and tracks it with the client.
   * @param timeout - The timeout for the token.
   * @returns The invite token.
   */
  create_invite (timeout? : number) : InviteToken {
    // Define the client pubkey.
    const pubkey = this._client.pubkey
    // Define the client relays.
    const relays = this._client.relays
    // Generate a unique secret.
    const secret = gen_message_id()
    // Create the session token.
    const token  = { pubkey, relays, created_at: now() }
    // Register the token with the client.
    this._create_invite(secret, token, timeout)
    // Emit the token registration to the client.
    this.emit('invite', token)
    // Return the session token.
    return { pubkey, relays, secret }
  }

  get_session (pubkey : string) : SessionToken | undefined {
    return this._active.get(pubkey)
  }

  /**
   * Registers a connection token with the client.
   * @param connect_tkn - The connection token to register.
   * @returns The response from the client.
   */
  async register_session (connect_tkn : ConnectionToken) : Promise<PublishedEvent> {
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

  async update_session (session : SessionToken) : Promise<void> {
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
   * Deletes a session token from the active session map.
   * @param pubkey - The pubkey of the session token to delete.
   * @returns True if the session token was deleted, false otherwise.
   */
  cancel_invite (secret : string) {
    const token = this._invites.get(secret)
    if (token) {
      this._invites.delete(secret)
      this._timers.delete(secret)
      this.emit('cancelled', token)
    }
  }

  /**
   * Deletes a session token from the active session map.
   * @param pubkey - The pubkey of the session token to delete.
   * @returns True if the session token was deleted, false otherwise.
   */
  revoke_session (pubkey : string) {
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
    this._invites.clear()
    this._pending.clear()
    this._timers.clear()
    this.emit('cleared')
  }
}

function has_missing_relays (
  client : NIP46Client,
  relays : string[],
) : boolean {
  for (const relay of relays) {
    if (!client.relays.includes(relay)) {
      return true
    }
  }
  return false
}
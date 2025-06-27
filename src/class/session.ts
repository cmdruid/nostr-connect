import { NostrClient }      from '@/class/client.js'
import { EventEmitter }     from '@/class/emitter.js'
import { Assert }           from '@vbyte/micro-lib/assert'
import { now }              from '@vbyte/micro-lib/util'

import * as CONST from '@/const.js'

import {
  PublishedEvent,
  SessionToken,
  RequestMessage,
  ConnectionToken,
  PermissionPolicy,
  SessionEventMap,
  SessionManagerOptions,
  SessionManagerConfig
} from '@/types/index.js'

const DEFAULT_POLICY : () => PermissionPolicy = () => {
  return {
    methods : CONST.DEFAULT_METHOD_PERMS,
    kinds   : CONST.DEFAULT_KIND_PERMS
  }
}

const DEFAULT_CONFIG : () => SessionManagerConfig = () => {
  return {
    policy  : DEFAULT_POLICY(),
    timeout : 30,
  }
}

export class SessionManager extends EventEmitter<SessionEventMap> {
  private readonly _config  : SessionManagerConfig
  private readonly _client  : NostrClient

  private readonly _active  : Map<string, SessionToken>   = new Map()
  private readonly _pending : Map<string, SessionToken>   = new Map()
  private readonly _timers  : Map<string, NodeJS.Timeout> = new Map()

  constructor (
    client  : NostrClient,
    options : SessionManagerOptions = {}
  ) {
    super()
    // Get the session manager configuration.
    this._config = get_session_config(options)
    // Set the client.
    this._client = client
    // Add the sessions to the active session map.
    for (const session of options.sessions ?? []) {
      // Add the token to the active session map.
      this._active.set(session.pubkey, session)
    }

    // Handle the request messages.
    this._client.on('request', this._handler.bind(this))
  }

  get active () : SessionToken[] {
    return Array.from(this._active.values())
  }

  get config () : SessionManagerConfig {
    return this._config
  }

  get names () : Map<string, SessionToken> {
    return new Map(
      Array.from(this._active.values()).map(session => [ session.name, session ])
    )
  }

  get pending () : SessionToken[] {
    return Array.from(this._pending.values())
  }

  _activate (pubkey : string) : void {
    // Fetch the token from the pending session map.
    const token = this._pending.get(pubkey)
    // Assert that the token exists.
    Assert.exists(token, 'session token not found')
    // Delete the token from the pending session map.
    this._pending.delete(token.pubkey)
    // Delete the timer from the timers map.
    this._timers.delete(token.pubkey)
    // Check if the session name is already in use.
    const existing = this.names.get(token.name)
    // If there is an existing session, delete it.
    if (existing) this._active.delete(existing.pubkey)
    // Add the token to the active session map.
    this._active.set(token.pubkey, token)
    // Emit the token activation to the client.
    this.emit('activated', token)
  }



  _register (session : SessionToken) : void {
    // Set the timeout for the token.
    const timeout = this.config.timeout
    // If the token is already registered, return early.
    if (this._pending.has(session.pubkey)) return
    // Add the token to the pending session map.
    this._pending.set(session.pubkey, session)
    // Set a timeout method to delete the token from the session manager.
    const timer = setTimeout(() => {
      // Delete the token from the session map.
      this._pending.delete(session.pubkey)
      this._timers.delete(session.pubkey)
      // Emit the token cancellation to the client.
      this.emit('cancelled', session)
    }, timeout * 1000)
    // Add the timer to the timers map.
    this._timers.set(session.pubkey, timer)
  }

  /**
   * Handles a pubkey request message from the client.
   * @param req - The request message to handle.
   * @returns The response from the client.
   */
  _handler (req : RequestMessage) {
    try {
      // Get the sender's public key.
      const sender_pk = req.env.pubkey
      // If the token is found in the pending session map,
      if (this._pending.has(sender_pk)) {
        // Activate the token.
        this._activate(sender_pk)
      }
      // Fetch the token from the active session map.
      const session = this._active.get(sender_pk)
      // If the session token is not found, return early.
      if (!session) return
      // Handle the request method.
      switch (req.method) {
        case CONST.REQ_METHOD.CONNECT:
          // Send a response to the client.
          this._client.respond(req.id, sender_pk, 'ack', session.relays)
          break
        case CONST.REQ_METHOD.GET_PUBKEY:
          // Get the client's public key.
          const pubkey = this._client.pubkey
          console.log('sending pubkey:', pubkey)
          // Send a response to the client.
          this._client.respond(req.id, sender_pk, pubkey, session.relays)
          break
        default:
          this.emit('request', req, session)
          break
      }
    } catch (err) {
      // Emit the error to the client.
      this.emit('error', err)
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
  async connect (connect_tkn : ConnectionToken) : Promise<PublishedEvent> {
    // Assert that the session name is required.
    Assert.exists(connect_tkn.name, 'session name is required')
    // Unpack the connection token.
    const { secret, ...token } = connect_tkn
    // Update our subscription list.
    await this._client.subscribe(token.relays)
    // Send a response to the issuing client.
    const res = await this._client.respond (
      secret, token.pubkey, secret, token.relays
    )
    // If the message is not accepted, return early.
    if (!res.ok) return res
    // Create the session token.
    const session = { ...token, created_at: now() }
    // Add the session token to the pending session map.
    this._pending.set(session.pubkey, session)
    // Emit the pending session token to the client.
    this.emit('pending', session)
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
   * Revokes a pending or active session.
   * @param pubkey - The pubkey of the session to revoke.
   */
  revoke (pubkey : string) {
    // Delete any pending session tokens.
    const is_pending = this._pending.delete(pubkey)
    // Delete any active session tokens.
    const is_active  = this._active.delete(pubkey)
    // If there was a pending session, delete the timer.
    if (is_pending)    this._timers.delete(pubkey)
    // If there was a pending or active session,
    if (is_pending || is_active) {
      // Emit the revoked event.
      this.emit('revoked', pubkey)
    }
  }

  /**
   * Clears all sessions from the session manager.
   */
  reset () : void {
    this._active.clear()
    this._pending.clear()
    this._timers.clear()
    this.emit('cleared')
  }
}

function get_session_config (
  options : SessionManagerOptions
) : SessionManagerConfig {
  const { sessions, ...rest } = options
  return { ...DEFAULT_CONFIG(), ...rest }
}

import { NostrSocket }      from '@/class/socket.js'
import { EventEmitter }     from '@/class/emitter.js'
import { Assert }           from '@vbyte/micro-lib/assert'
import { now }              from '@vbyte/micro-lib/util'

import * as CONST from '@/const.js'

import {
  AgentSession,
  RequestMessage,
  InviteToken,
  SessionEventMap,
  SessionManagerOptions,
  SessionManagerConfig
} from '@/types/index.js'
import { create_permission_request } from '@/lib/perms.js'

const DEFAULT_CONFIG : () => SessionManagerConfig = () => {
  return {
    negotiate_timeout : 5
  }
}

export class SessionManager extends EventEmitter<SessionEventMap> {
  private readonly _config  : SessionManagerConfig
  private readonly _socket  : NostrSocket

  private readonly _active  : Map<string, AgentSession>   = new Map()
  private readonly _pending : Map<string, AgentSession>   = new Map()
  private readonly _timers  : Map<string, NodeJS.Timeout> = new Map()

  constructor (
    socket  : NostrSocket,
    options : SessionManagerOptions = {}
  ) {
    super()
    // Get the session manager configuration.
    this._config = get_session_config(options)
    // Set the client.
    this._socket = socket
    // Add the sessions to the active session map.
    for (const session of options.sessions ?? []) {
      // Add the token to the active session map.
      this._active.set(session.pubkey, session)
    }
  }

  get active () : AgentSession[] {
    return Array.from(this._active.values())
  }

  get config () : SessionManagerConfig {
    return this._config
  }

  get names () : Map<string, AgentSession> {
    return new Map(
      Array.from(this._active.values()).map(session => [
        session.profile.name ?? session.pubkey, session
      ])
    )
  }

  get pending () : AgentSession[] {
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
    const existing = this.names.get(token.profile.name ?? token.pubkey)
    // If there is an existing session, delete it.
    if (existing) this._active.delete(existing.pubkey)
    // Add the token to the active session map.
    this._active.set(token.pubkey, token)
    // Emit the token activation to the client.
    this.emit('activated', token)
  }

  _register (session : AgentSession) : void {
    // Set the timeout for the token.
    const timeout = this.config.negotiate_timeout * 1000
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
      this.emit('expired', session)
    }, timeout)
    // Add the timer to the timers map.
    this._timers.set(session.pubkey, timer)
  }

  /**
   * Handles a pubkey request message from the client.
   * @param req - The request message to handle.
   * @returns The response from the client.
   */
  handler (msg : RequestMessage) {
    try {
      // Emit the message event.
      this.emit('message', msg)
      // Get the sender's public key.
      const sender_pk = msg.env.pubkey
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
      switch (msg.method) {
        case CONST.REQ_METHOD.CONNECT:
          // Send a response to the client.
          this._socket.accept(msg.id, sender_pk, 'ack', session.relays)
          break
        case CONST.REQ_METHOD.GET_PUBKEY:
          // Get the client's public key.
          const pubkey = this._socket.pubkey
          // Send a response to the client.
          this._socket.accept(msg.id, sender_pk, pubkey, session.relays)
          break
        default:
          const req = create_permission_request(msg, session)
          this.emit('request', req)
          break
      }
    } catch (err) {
      // Emit the error to the client.
      this.emit('error', err)
    }
  }

  get (pubkey : string) : AgentSession | undefined {
    return this._active.get(pubkey)
  }

  async negotiate (connect_tkn : InviteToken) {
    // Unpack the connection token.
    const { secret, ...token } = connect_tkn
    // Update our subscription list.
    await this._socket.subscribe(token.relays)
    // Create the session token.
    const session = { ...token, created_at: now() }
    // Add the session token to the pending session map.
    this._pending.set(session.pubkey, session)
    // Send a response to the issuing client.
    this._socket.accept(secret, token.pubkey, secret, token.relays)
    // Emit the pending session token to the client.
    this.emit('pending', session)
    // Return the session token.
    return session
  }

  /**
   * Registers a connection token with the client.
   * @param connect_tkn - The connection token to register.
   * @returns The response from the client.
   */
  async connect (invite : InviteToken) : Promise<AgentSession> {
    // Return a promise to activate the session.
    return new Promise((resolve, reject) => {
      // Set the timeout value.
      const timeout = this.config.negotiate_timeout * 1000
      // Initialize the timer.
      let timer = setTimeout(() => {
        clearTimeout(timer)
        reject('timeout')
      }, timeout)
      // Register the listener.
      this.within('activated', (token) => {
        if (token.pubkey === invite.pubkey) {
          clearTimeout(timer)
          resolve(token)
        }
      }, timeout)
      // Register the invite
      this.negotiate(invite)
    })
  }

  update (session : AgentSession) {
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

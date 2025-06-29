import { Buff }           from '@vbyte/buff'
import { EventEmitter }   from '@/class/emitter.js'
import { now }            from '@vbyte/micro-lib/util'
import { DEFAULT_POLICY } from '@/lib/perms.js'

import type { NostrClient } from '@/class/client.js'

import type {
  ConnectionToken,
  ChannelConfig,
  ChannelManagerOptions,
  ResponseMessage,
  ChannelEventMap,
  ChannelMember
} from '@/types/index.js'

const DEFAULT_CONFIG : () => ChannelConfig = () => {
  return {
    debug   : false,
    policy  : DEFAULT_POLICY(),
    profile : {},
    timeout : 30,
    verbose : false,
  }
}

export class ChannelManager extends EventEmitter<ChannelEventMap> {

  private readonly _config  : ChannelConfig
  private readonly _client  : NostrClient

  private readonly _invites : Set<string> = new Set()
  private readonly _members : Map<string, ChannelMember>  = new Map()
  private readonly _timers  : Map<string, NodeJS.Timeout> = new Map()

  constructor (
    client  : NostrClient,
    options : ChannelManagerOptions = {}
  ) {
    super()
    // Set the client.
    this._client = client
    // Set the configuration.
    this._config = get_channel_config(options)
    // Add the sessions to the active session map.
    for (const mbr of options.members ?? []) {
      // Add the token to the active session map.
      this._members.set(mbr.pubkey, mbr)
    }

    // Handle the request messages.
    this._client.on('response', this._handler.bind(this))
  }

  get config () : ChannelConfig {
    return this._config
  }

  get invites () : string[] {
    return Array.from(this._invites)
  }

  get members () : ChannelMember[] {
    return Array.from(this._members.values())
  }

  _join (challenge : string, pubkey : string) {
    const mbr : ChannelMember = { pubkey, created_at : now() }
    // Add the invite to the peers map.
    this._members.set(pubkey, mbr)
    // Delete the invite from the invites map.
    this._invites.delete(challenge)
    // Delete the timer from the timers map.
    this._timers.delete(challenge)
    // Emit the invitation to the client.
    this.emit('join', mbr)
  }

  _handler (res : ResponseMessage) {
    try {
      // If the response is not an accept, return early.
      if (res.type !== 'accept') return
      // If the invite is not found, return early.
      if (this._invites.has(res.result)) {
        // Get the sender of the response.
        const sender = res.env.pubkey
        // If the invite is found, confirm the invitation.
        this._join(res.result, sender)
      }
    } catch (err) {
      this.emit('error', err)
    }
  }

  _invite (challenge : string) {
    // Set the timeout for the token.
    const timeout = this.config.timeout
    // Add the token to the invites map.
    this._invites.add(challenge)
    // Set a timeout method to delete the token from the session manager.
    const timer = setTimeout(() => {
      // Delete the token from the session map.
      this._invites.delete(challenge)
      this._timers.delete(challenge)
      // Emit the token cancellation to the client.
      this.emit('expired', challenge)
    }, timeout * 1000)
    // Add the timer to the timers map.
    this._timers.set(challenge, timer)
    // Emit the invitation to the client.
    this.emit('invite', challenge)
  }

  invite () : ConnectionToken {
    // Create a new secret.
    const secret = Buff.random(32).hex
    // Create a new connection token.
    const token : Omit<ConnectionToken, 'secret'> = {
      policy  : this.config.policy,
      profile : this.config.profile,
      pubkey  : this._client.pubkey,
      relays  : this._client.relays
    }
    // Register the token with the invite manager.
    this._invite(secret)
    // Return the connection token with the secret.
    return { ...token, secret }
  }

  /**
   * Cancels a pending inviation for a session
   * @param challenge - The challenge of the invitation to cancel.
   */
  cancel (challenge : string) {
    const is_cancelled = this._invites.delete(challenge)
    if (is_cancelled) {
      this._timers.delete(challenge)
      this.emit('cancel', challenge)
    }
  }
}

function get_channel_config (
  options : ChannelManagerOptions
) : ChannelConfig {
  const { members, ...rest } = options
  return { ...DEFAULT_CONFIG(), ...rest }
}

import { NostrClient }    from '@/class/client.js'
import { EventEmitter }   from '@/class/emitter.js'
import { CALL_METHOD }    from '@/const.js'
import { create_message } from '@/lib/message.js'
import { gen_message_id } from '@/lib/util.js'

import {
  decode_connect_url,
  encode_bunker_url
} from '@/lib/encoder.js'

import {
  PublishedEvent,
  SessionToken,
  RequestMessage,
  SessionEventMap
} from '@/types/index.js'

export class SessionManager extends EventEmitter <SessionEventMap> {
  private readonly _client  : NostrClient

  private readonly _active  : Map<string, SessionToken> = new Map()
  private readonly _pending : Map<string, SessionToken> = new Map()

  constructor (client : NostrClient) {
    super()
    this._client = client

    this.client.on('request', this._handler.bind(this))
  }

  get client() : NostrClient {
    return this._client
  }

  get pubkey() : string {
    return this.client.pubkey
  }

  get session() {
    return {
      active  : this._active,
      pending : this._pending
    }
  }

  _handler (msg : RequestMessage) : void {

    if (msg.method === CALL_METHOD.CONNECT) {
      this._register(msg)
      return
    }

    const session = this.session.active.get(msg.env.pubkey)

    if (!session) {
      this.emit('reject', 'no session found', msg)
      return
    }

    this.emit('request', msg)
  }

  async _register (req : RequestMessage) : Promise<void> {
    const pubkey = req.params.at(0)
    if (!pubkey) return
    const secret = req.params.at(1)
    if (!secret) return
    const token  = this.session.pending.get(secret)
    if (!token) return
    const msg  = create_message({ id: req.id, result: token.secret })
    const res  = await this.client.send(msg, pubkey)
    if (!res.ok) return
    this.session.active.set(pubkey, { ...token, pubkey })
    this.session.pending.delete(secret)
    this.emit('register', token)
  }

  generate (options : Partial<SessionToken> = {}) : string {
    // create bunker url, and a listener for the response.
    const pubkey = this.pubkey
    const secret = gen_message_id()
    const relays = this.client.relays
    const token  = { ...options, pubkey, relays, secret }
    this.session.pending.set(secret, token)
    return encode_bunker_url(token)
  }

  async connect (connect_str : string) : Promise<PublishedEvent> {
    const id    = gen_message_id()
    const token = decode_connect_url(connect_str)
    const msg   = create_message({ id, result: token.secret })
    const res   = await this.client.send(msg, token.pubkey)
    if (!res.ok) return res
    this.session.active.set(token.pubkey, token)
    this.emit('register', token)
    return res
  }
  
  delete (pubkey : string) : boolean {
    return this.session.active.delete(pubkey)
  }

  clear () : void {
    this.session.active.clear()
    this.session.pending.clear()
  }
}

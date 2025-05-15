import { SimplePool }       from 'nostr-tools'
import { EventEmitter }     from './emitter.js'
import { gen_message_id }   from '@/lib/util.js'
import { now, parse_error } from '@/util/index.js'

import {
  SubCloser,
  SubscribeManyParams
} from 'nostr-tools/abstract-pool'

import {
  create_envelope,
  decrypt_envelope,
  parse_message
} from '@/lib/message.js'

import { verify_relays } from '@/lib/validate.js'

import type {
  EventFilter,
  SignedEvent,
  ClientConfig,
  SignDeviceAPI,
  PublishResponse,
  ClientInboxMap,
  ClientEventMap,
  PublishedEvent,
  MessageTemplate
} from '@/types/index.js'

/**
 * Default configuration settings for a Nostr node.
 */
const DEFAULT_CONFIG : () => ClientConfig = () => {
  return {
    kind: 24133,
    filter: {
      kinds : [ 24133 ], // Filter for specific Nostr event type
      since : now()      // Only get events from current time onwards
    },
    req_timeout  : 5000,
    since_offset : 5,
    start_delay  : 2000
  }
}

export class NostrClient extends EventEmitter <ClientEventMap> {
  // Core node components
  private readonly _config   : ClientConfig
  private readonly _pool     : SimplePool
  private readonly _pubkey   : string
  private readonly _relays   : string[]
  private readonly _signer   : SignDeviceAPI

  // Message routing system
  private readonly _inbox : ClientInboxMap = {
    id     : new EventEmitter(), // Route by message ID
    method : new EventEmitter(), // General event handling
    pubkey : new EventEmitter()  // Route by peer pubkey
  }

  private _filter : EventFilter
  private _ready  : boolean = false
  private _sub    : SubCloser | null = null

  /**
   * Creates a new NostrNode instance.
   * @param relays   Array of relay URLs to connect to.
   * @param seckey   Secret key in hex format
   * @param options  Optional configuration parameters
   * @throws {Error} If relays array is invalid or secret key is malformed
   */
  constructor (
    pubkey  : string,
    relays  : string[],
    signer  : SignDeviceAPI,
    options : Partial<ClientConfig> = {}
  ) {
    super()
    
    // Validate inputs before initialization
    verify_relays(relays)
    
    this._pubkey = pubkey
    this._signer = signer
  
    this._config  = get_node_config(options)
    this._filter  = get_filter_config(this, options.filter)
    this._pool    = new SimplePool()
    this._relays  = relays

    this.emit('info', 'filter:', JSON.stringify(this.filter, null, 2))
  }

  get config() : ClientConfig {
    return this._config
  }

  get filter() : EventFilter {
    return this._filter
  }

  get inbox() : ClientInboxMap {
    return this._inbox
  }

  get pubkey() : string {
    return this._pubkey
  }

  get ready() : boolean {
    return this._ready
  }

  get relays() : string[] {
    return this._relays
  }

  private async _handler (event : SignedEvent) : Promise<void> {
    try {
      // Decrypt and parse the incoming message
      const payload = await decrypt_envelope(event, this._signer)
      const message = parse_message(payload, event)

      this.emit('message', message)

      switch (message.type) {
        case 'request':
          this.inbox.method.emit(message.method, message)
          this.emit('request', message)
          break
        case 'response':
          this.emit('response', message)
          break
        default:
          this.emit('error', event.id, 'unknown message type')
      }

      this.inbox.id.emit(message.id, message)
      this.inbox.pubkey.emit(message.env.pubkey, message)
    } catch (err) {
      this.emit('bounced', event.id, parse_error(err))
    }
  }

  private _init() : void {
    this._ready = true
    this.emit('ready', this)
  }

  /**
   * Publishes a signed event to the Nostr network.
   * @param event  Signed event to publish
   * @returns      Publication status and message ID
   */
  private async _publish (
    event : SignedEvent
  ) : Promise<PublishResponse> {
    // Publish to all connected relays
    const receipts = this._pool.publish(this.relays, event)
    return Promise.allSettled(receipts).then(resolve_receipts)
  }

  private _subscribe() : void {
    const params : SubscribeManyParams = {
      onevent : this._handler,
      oneose  : this._init
    }
    this._sub = this._pool.subscribe(this.relays, this.filter, params)
  }

  /**
   * Establishes connections to configured relays.
   * @param timeout  The timeout for the connection.
   * @returns        This node instance
   * @emits ready    When connections are established
   */
  async connect (timeout? : number) : Promise<this> {
    timeout ??= this.config.req_timeout
    // Start listening for events on all relays.
    this._subscribe()
    return new Promise(resolve => {
      this.once('ready', () => resolve(this))
    })
  }

  /**
   * Gracefully closes all relay connections.
   * 
   * @emits close  When all connections are terminated
   */
  async close () : Promise<void> {
    if (this._sub !== null) {
      this._sub.close()
    }
    if (this._pool.close !== undefined) {
      this._pool.close(this.relays)
    }
    this._ready = false
    this.emit('close', this)
  }

  /**
   * Publishes a message to the Nostr network.
   * @param message   Message data to publish
   * @param recipient Target peer's public key
   * @returns        Publication status and message ID
   */
  async send (
    message   : MessageTemplate,
    recipient : string
  ) : Promise<PublishedEvent> {
    message.id   ??= gen_message_id()
    const config   = { kind : this.config.kind, tags : [] }
    const payload  = JSON.stringify(message)
    const event    = await create_envelope(config, payload, recipient, this._signer)
    const res      = await this._publish(event)
    return { ...res, event }
  }
}

/**
 * Merges provided options with default node configuration.
 * @param opt      Custom configuration options
 * @returns        Complete node configuration
 */
function get_node_config (
  opt : Partial<ClientConfig> = {}
) : ClientConfig {
  const config = DEFAULT_CONFIG()
  const filter = { ...config.filter, ...opt.filter }
  return { ...config, filter }
}

/**
 * Combines custom filter settings with defaults.
 * @param client   Nostr client instance
 * @param filter   Custom filter settings
 * @returns        Complete filter configuration
 */
function get_filter_config (
  client : NostrClient,
  filter : Partial<EventFilter> = {}
) : EventFilter {
  return { ...client.config.filter, ...filter }
}

function resolve_receipts (
  settled : PromiseSettledResult<string>[]
) : PublishResponse {
  const acks : string[] = [], fails : string[] = []
  for (const prom of settled) {
    if (prom.status === 'fulfilled') {
      acks.push(prom.value)
    } else {
      fails.push(prom.reason)
    }
  }
  return { acks, fails, ok: acks.length > 0 }
}

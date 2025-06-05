import { SimplePool }       from 'nostr-tools'
import { EventEmitter }     from '@/class/emitter.js'
import { SessionManager }   from '@/class/session.js'
import { gen_message_id }   from '@/lib/util.js'
import { verify_relays }    from '@/lib/validate.js'

import { EVENT_KIND, REQ_METHOD }   from '@/const.js'
import { Assert, now, parse_error } from '@/util/index.js'

import {
  create_accept_template,
  create_envelope,
  create_reject_template,
  create_request_template,
  decrypt_envelope,
  parse_message
} from '@/lib/message.js'

import type { SubscribeManyParams } from 'nostr-tools/abstract-pool'

import type {
  SignedEvent,
  ClientConfig,
  SignerDeviceAPI,
  PublishResponse,
  ClientInboxMap,
  ClientEventMap,
  PublishedEvent,
  MessageTemplate,
  RequestTemplate,
  ResponseMessage,
  RequestMessage
} from '@/types/index.js'

/**
 * Default configuration settings for a Nostr node.
 */
const DEFAULT_CONFIG : () => ClientConfig = () => {
  return {
    req_timeout : 5000,
    start_delay : 2000
  }
}

export class NostrClient extends EventEmitter <ClientEventMap> {
  // Core node components
  private readonly _config   : ClientConfig
  private readonly _pool     : SimplePool
  private readonly _pubkey   : string
  private readonly _relays   : string[]
  private readonly _session  : SessionManager
  private readonly _signer   : SignerDeviceAPI

  // Message routing system
  private readonly _inbox : ClientInboxMap = {
    req : new EventEmitter(),
    res : new EventEmitter()
  }

  private _ready : boolean = false

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
    signer  : SignerDeviceAPI,
    options : Partial<ClientConfig> = {}
  ) {
    super()
    
    // Validate inputs before initialization
    verify_relays(relays)
    
    this._pubkey = pubkey
    this._signer = signer
  
    this._config  = get_node_config(options)
    this._pool    = new SimplePool()
    this._relays  = relays
    this._session = new SessionManager(this)
  }

  get config() : ClientConfig {
    return this._config
  }

  get inbox() : ClientInboxMap {
    return this._inbox
  }

  get is_ready() : boolean {
    return this._ready
  }

  get pubkey() : string {
    return this._pubkey
  }

  get relays() : string[] {
    return this._relays
  }

  get signer() : SignerDeviceAPI {
    return this._signer
  }

  private async _handler (event : SignedEvent) : Promise<void> {
    // Ignore events from the client itself.
    if (event.pubkey === this.pubkey) return
    // Emit the event to the client emitter.
    this.emit('event', event)
    // Try to handle the event.
    try {
      // Decrypt and parse the incoming message
      const payload = await decrypt_envelope(event, this._signer)
      const message = parse_message(payload, event)
      const type    = message.type

      // If the message is a request,
      if (type === 'request') {
        // If the message is a ping,
        if (message.method === REQ_METHOD.PING) {
          // Send a pong response.
          this._pong(message)
        // If the message is a connection request,
        } else if (message.method === REQ_METHOD.CONNECT) {
          // Handle the connect message.
          this._session.handler(message)
        } else {
          // Fetch the session token from the active session map.
          const token = this._session.active.get(message.env.pubkey)
          // If no session exists, ignore the message.
          if (!token) return
          // Emit the message to the request inbox.
          this.inbox.req.emit(message.method, message)
        }
      }
      // If the message is an accept or reject,
      else if (type === 'accept' || type === 'reject') {
        // Emit the message to the response inbox.
        this.inbox.res.emit(message.id, message)
      }
      // Emit the message to client emitter.
      this.emit('message', message)
    } catch (err) {
      // Emit the error to the client emitter.
      this.emit('error', err)
      // Emit the bounced event to the client emitter.
      this.emit('bounced', event.id, parse_error(err))
    }
  }

  private _init() : void {
    // Set the client to ready.
    this._ready = true
    // Emit the ready event.
    this.emit('ready', this)
  }

  private async _pong (message : RequestMessage) : Promise<PublishedEvent> {
    // Assert the message is a ping.
    Assert.ok(message.method === 'ping', 'invalid ping message')
    // Create the pong message template.
    const tmpl  = { result: 'pong', id: message.id }
    // Send the pong message.
    return this._send(tmpl, message.env.pubkey)
  }

  async _notarize (
    message   : MessageTemplate,
    recipient : string
  ) : Promise<SignedEvent> {
    // Generate a message ID if not provided.
    message.id   ??= gen_message_id()
    // Create the message configuration.
    const config   = { kind : EVENT_KIND, tags : [] }
    // Serialize the message.
    const payload  = JSON.stringify(message)
    // Return a signed event.
    return create_envelope(config, payload, recipient, this._signer)
  }

  private async _send (
    template  : MessageTemplate,
    recipient : string
  ) : Promise<PublishedEvent> {
    // Create the event.
    const event    = await this._notarize(template, recipient)
    // Collect the publication promises.
    const promises = this._pool.publish(this.relays, event)
    // Wait for the publication promises to settle.
    const settled  = await Promise.allSettled(promises)
    // Parse the receipts.
    const receipts = parse_receipts(settled)
    // Return the receipts along with the event.
    return { ...receipts, event }
  }

  private _subscribe() : void {
    // Get the filter configuration.
    const filter = { kinds : [ EVENT_KIND ], since : now() }
    // Create the subscription parameters.
    const params : SubscribeManyParams = {
      onevent : this._handler.bind(this),
      oneose  : this._init.bind(this),
      onclose : this.close.bind(this)
    }
    // Subscribe to the relays.
    this._pool.subscribe(this.relays, filter, params)
  }

  /**
   * Establishes connections to configured relays.
   * @param req_timeout  The timeout for the connection.
   * @returns            This node instance.
   * @emits ready        When connections are established.
   */
  async connect (req_timeout? : number) : Promise<this> {
    // Set the timeout.
    const timeout = req_timeout ??= this.config.req_timeout
    // Subscribe to the relays.
    this._subscribe()
    // Wait for the client to be ready.
    return new Promise((resolve, reject) => {
      // Set the rejection timer.
      const timer = setTimeout(() => reject(new Error('failed to connect')), timeout)
      // If the client is ready, resolve the promise.
      this.within('ready', () => {
        clearTimeout(timer)
        resolve(this)
      }, timeout)
    })
  }

  /**
   * Gracefully closes all relay connections.
   * 
   * @emits close  When all connections are terminated
   */
  async close () : Promise<void> {
    // If the client is not ready, return.
    if (!this._ready) return
    // If the pool has a close method, close the relays.
    if (this._pool.close) this._pool.close(this.relays)
    // Set the client to not ready.
    this._ready = false
    // Emit the close event.
    this.emit('close', this)
  }

  /**
   * Pings a recipient.
   * @param recipient  The recipient of the ping.
   * @returns          True if the recipient pings back, false otherwise.
   */
  async ping (recipient : string) : Promise<boolean> {
    // Create the ping template.
    const tmpl = { method: 'ping', id: gen_message_id() }
    // Send the ping.
    return this.request(tmpl, recipient)
      .then(res => res.type === 'accept')
      .catch(_ => false)
  }

  /**
   * Sends a request to a recipient.
   * @param message      The request message.
   * @param recipient    The recipient of the request.
   * @param req_timeout  The timeout for the request.
   * @returns            The response message.
   */
  async request (
    message      : Partial<RequestTemplate>,
    recipient    : string,
    req_timeout? : number
  ) : Promise<ResponseMessage> {
    // Create the request template.
    const config   = { ...message, id: message.id ?? gen_message_id() }
    // Create the request template.
    const template = create_request_template(config)
    // Set the timeout.
    const timeout  = req_timeout ??= this.config.req_timeout
    // Create the promise to resolve the response.
    const receipt  = new Promise<ResponseMessage>((resolve, reject) => {
      // Set the expiration timer.
      const timer  = setTimeout(() => reject('timeout'), timeout)
      // Wait for the response.
      this.inbox.res.within(template.id, (msg) => {
        clearTimeout(timer)
        resolve(msg)
      }, timeout)
    })
    // Send the request.
    this._send(template, recipient)
    // Return the promise to resolve the response.
    return receipt
  }

  /**
   * Send a response to a request.
   * @param id       The message ID.
   * @param pubkey   The recipient's public key.
   * @param result   The result of the request.
   * @returns        The published event.
   */
  async respond (
    id      : string,
    pubkey  : string,
    result  : string
  ) : Promise<PublishedEvent> {
    // Create the response template.
    const tmpl = create_accept_template({ id, result })
    // Send the response.
    return this._send(tmpl, pubkey)
  }

  /**
   * Send a rejection to a request.
   * @param id       The message ID.
   * @param pubkey   The recipient's public key.
   * @param reason   The reason for the rejection.
   * @returns        The published event.
   */
  async reject (
    id     : string,
    pubkey : string,
    reason : string
  ) : Promise<PublishedEvent> {
    // Create the rejection template.
    const tmpl = create_reject_template({ id, error: reason })
    // Send the rejection.
    return this._send(tmpl, pubkey)
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
  return { ...DEFAULT_CONFIG(), ...opt }
}

/**
 * Parses the receipts from the settled promises.
 * @param settled  The settled promises.
 * @returns        The parsed receipts.
 */
function parse_receipts (
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

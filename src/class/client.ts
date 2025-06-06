import { SimplePool }     from 'nostr-tools'
import { EventEmitter }   from '@/class/emitter.js'
import { SessionManager } from '@/class/session.js'
import { gen_message_id } from '@/lib/util.js'

import { EVENT_KIND, REQ_METHOD }       from '@/const.js'
import { parse_config, verify_options } from '@/lib/validate.js'
import { Assert, now, parse_error }     from '@/util/index.js'

import {
  create_envelope,
  decrypt_envelope
} from '@/lib/event.js'

import {
  create_accept_template,
  create_reject_template,
  create_request_template,
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
  RequestMessage,
  ClientOptions
} from '@/types/index.js'

/**
 * Default configuration settings for a Nostr node.
 */
const DEFAULT_CONFIG : () => ClientConfig = () => {
  return {
    debug           : false,
    req_timeout     : 5000,
    invite_timeout  : 60,
    verbose         : true
  }
}

const LOG_PREFIX = '[ nip46 ]'

export class NIP46Client extends EventEmitter <ClientEventMap> {
  // Core node components
  private readonly _config   : ClientConfig
  private readonly _pool     : SimplePool
  private readonly _pubkey   : string
  private readonly _session  : SessionManager
  private readonly _signer   : SignerDeviceAPI

  // Message routing system
  private readonly _inbox : ClientInboxMap = {
    req : new EventEmitter(),
    res : new EventEmitter()
  }

  private _ready  : boolean  = false
  private _relays : string[] = []

  /**
   * Creates a new NostrNode instance.
   * @param pubkey   The public key of the client.
   * @param signer   The signer device API.
   * @param options  Optional configuration parameters
   */
  constructor (
    pubkey  : string,
    signer  : SignerDeviceAPI,
    options : ClientOptions = {}
  ) {
    // Verify the client options.
    verify_options(options)
    // Create the event emitter.
    super()
    // Set the client public key and signer.
    this._pubkey = pubkey
    this._signer = signer
    // Set the client configuration and pool
    this._config  = get_node_config(options)
    this._pool    = new SimplePool()
    this._relays  = options.relays ?? []
    this._session = new SessionManager(this, options.sessions ?? [])
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

  get log() {
    return {
      debug : (...args : any[]) => this.config.debug   && console.log(LOG_PREFIX, ...args),
      info  : (...args : any[]) => this.config.verbose && console.log(LOG_PREFIX, ...args)
    }
  }

  get pubkey() : string {
    return this._pubkey
  }

  get relays() : string[] {
    return this._relays
  }

  get session() : SessionManager {
    return this._session
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
          // Handle the connect request.
          this._session.handle_connect_request(message)
        // If the message is a pubkey request,
        } else if (message.method === REQ_METHOD.GET_PUBKEY) {
          // Handle the get pubkey message.
          this._session.handle_pubkey_request(message)
        } else {
          // Emit the message to client emitter.
          this.emit('request', message)
          // Log the request.
          this.log.info('received request for method:', message.method)
          // Emit the request to the request inbox.
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
      // Log the error.
      this.log.debug('bounced event:', event, err)
      // Emit the bounced event to the client emitter.
      this.emit('bounced', event.id, parse_error(err))
    }
  }

  private _init() : void {
    // Set the client to ready.
    this._ready = true
    // Log the ready event.
    this.log.info('connected and subscribed')
    // Emit the ready event.
    this.emit('ready', this)
  }

  private async _pong (message : RequestMessage) : Promise<PublishedEvent> {
    // Assert the message is a ping.
    Assert.ok(message.method === 'ping', 'invalid ping message')
    // Create the pong message template.
    const tmpl  = { result: 'pong', id: message.id }
    // Log the pong message.
    this.log.debug('sending pong:', tmpl, message.env.pubkey)
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
    // Log the publication.
    this.log.debug('publishing to relays:', promises)
    // Wait for the publication promises to settle.
    const settled  = await Promise.allSettled(promises)
    // Parse the receipts.
    const receipts = parse_receipts(settled)
    // Create the response.
    const response = { ...receipts, event }
    // Emit the event to the client emitter.
    this.emit('publish', response)
    // Return the response.
    return response
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
    // Log the close event.
    this.log.info('connection closed')
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
    // Log the ping.
    this.log.info('sending ping to:', recipient)
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
    const tmpl     = create_request_template(config)
    // Set the timeout.
    const timeout  = req_timeout ??= this.config.req_timeout
    // Create the promise to resolve the response.
    const receipt  = new Promise<ResponseMessage>((resolve, reject) => {
      // Set the expiration timer.
      const timer  = setTimeout(() => reject('timeout'), timeout)
      // Wait for the response.
      this.inbox.res.within(tmpl.id, (msg) => {
        clearTimeout(timer)
        resolve(msg)
      }, timeout)
    })
    // Log the request.
    this.log.info('sending request to:', recipient)
    this.log.debug('request:', tmpl)
    // Send the request.
    this._send(tmpl, recipient)
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
    // Log the response.
    this.log.info('sending response to:', pubkey)
    this.log.debug('response:', tmpl)
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
    // Log the rejection.
    this.log.info('sending rejection to:', pubkey)
    this.log.debug('rejection:', tmpl)
    // Send the rejection.
    return this._send(tmpl, pubkey)
  }

  async subscribe (relays : string[] = []) : Promise<void> {
    // Set the timeout.
    const timeout = this.config.req_timeout
    // Set the relays.
    this._relays  = [ ...this.relays, ...relays ]
    // Get the filter configuration.
    const filter = { kinds : [ EVENT_KIND ], since : now() }
    // Create the subscription parameters.
    const params : SubscribeManyParams = {
      onevent : this._handler.bind(this),
      oneose  : this._init.bind(this),
      onclose : this.close.bind(this)
    }
    // Log the subscription.
    this.log.info('subscribing to relays:', this.relays)
    // Subscribe to the relays.
    this._pool.subscribe(this.relays, filter, params)
    // Return a promise to resolve when the subscription is established.
    return new Promise((resolve, reject) => {
      // Set the rejection timer.
      const timer = setTimeout(() => reject('timeout'), timeout)
      // If the client is ready, resolve the promise.
      this.within('ready', () => { clearTimeout(timer); resolve() }, timeout)
    })
  }
}

/**
 * Merges provided options with default node configuration.
 * @param opt      Custom configuration options
 * @returns        Complete node configuration
 */
function get_node_config (
  opt : Partial<ClientOptions> = {}
) : ClientConfig {
  return parse_config({ ...DEFAULT_CONFIG(), ...opt })
}

/**
 * Parses the receipts from the settled promises.
 * @param settled  The settled promises.
 * @returns        The parsed receipts.
 */
function parse_receipts (
  settled : PromiseSettledResult<string>[]
) : PublishResponse {
  let acks = 0, fails = 0
  for (const prom of settled) {
    if (prom.status === 'fulfilled') {
      acks++
    } else {
      fails++
    }
  }
  return { acks, fails, ok: acks > 0 }
}

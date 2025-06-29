import { Buff }             from '@vbyte/buff'
import { SimplePool }       from 'nostr-tools'
import { Assert }           from '@vbyte/micro-lib/assert'
import { hash256 }          from '@vbyte/micro-lib/hash'
import { now, parse_error } from '@vbyte/micro-lib/util'
import { EventEmitter }     from '@/class/emitter.js'
import { gen_message_id }   from '@/lib/util.js'

import { DOMAIN_TAG, EVENT_KIND, REQ_METHOD } from '@/const.js'
import { parse_config, verify_options }       from '@/lib/validate.js'

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
  ClientEventMap,
  PublishReceipt,
  MessageTemplate,
  RequestTemplate,
  ResponseMessage,
  RequestMessage,
  ClientOptions
} from '@/types/index.js'

/**
 * Default configuration settings for a Nostr Client.
 */
const DEFAULT_CONFIG : () => ClientConfig = () => {
  return {
    timeout : 5000,
  }
}

export class NostrClient extends EventEmitter <ClientEventMap> {

  private readonly _config : ClientConfig
  private readonly _pool   : SimplePool
  private readonly _relays : Set<string> = new Set()
  private readonly _signer : SignerDeviceAPI
  private readonly _sub_id : string

  private _ready  : boolean  = false

  /**
   * Creates a new instance.
   * @param signer   The signer device API.
   * @param options  Optional configuration parameters
   */
  constructor (
    signer  : SignerDeviceAPI,
    options : ClientOptions = {}
  ) {
    // Create the event emitter.
    super()
    // Verify the client options.
    verify_options(options)
    // Set the client signer.
    this._signer = signer
    // Set the client configuration and pool
    this._config  = get_node_config(options)
    // Initialize the pool.
    this._pool    = new SimplePool()
    // Set the relays.
    this._relays  = new Set(options.relays ?? [])
    // Set the subscription ID.
    this._sub_id  = get_sub_id(this.pubkey)
  }

  get config () : ClientConfig {
    return this._config
  }

  get is_ready () : boolean {
    return this._ready
  }

  get pubkey () : string {
    return this._signer.get_pubkey()
  }

  get relays () : string[] {
    return Array.from(this._relays)
  }

  get status () {
    return this._pool.listConnectionStatus()
  }

  private _close () : void {
    // Set the client to not ready.
    this._ready = false
    // Emit the unsubscribed event.
    this.emit('unsubscribed')
  }

  private _eose () : void {
    // Emit the subscribed event.
    this.emit('subscribed')
    // If the client is already ready, return.
    if (this._ready) return
    // Set the client to ready.
    this._ready = true
    // Emit the ready event.
    this.emit('ready')
  }

  private async _handler (event : SignedEvent) : Promise<void> {
    // Ignore events from the client itself.
    if (event.pubkey === this.pubkey) return
    // Emit the event to the client emitter.
    this.emit('event', event)
    // Try to handle the event.
    try {
      // Decrypt and parse the incoming message.
      const payload = await decrypt_envelope(event, this._signer)
      const message = parse_message(payload, event)
      const type    = message.type
      // Emit the message to client emitter.
      this.emit('message', message)
      // If the message is a request,
      if (type === 'request') {
        // If the message is a ping,
        if (message.method === REQ_METHOD.PING) {
          // Send a pong response.
          this._pong(message)
        } else {
          // Emit the request to the client emitter.
          this.emit('request', message)
        }
      } else if (type === 'accept' || type === 'reject') {
        // Emit the message to client emitter.
        this.emit('response', message)
      }
    } catch (err) {
      // Emit the bounced event to the client emitter.
      this.emit('bounced', event, parse_error(err))
    }
  }

  private async _pong (message : RequestMessage) : Promise<PublishReceipt> {
    // Assert the message is a ping.
    Assert.ok(message.method === 'ping', 'invalid ping message')
    // Create the pong message template.
    const tmpl = { result: 'pong', id: message.id }
    // Send the pong message.
    return this.send(tmpl, message.env.pubkey)
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

  _subscribe () {
    // Assert that there are relays to subscribe to.
    Assert.ok(this.relays.length > 0, 'no relays to subscribe to')
    // Get the filter configuration.
    const filter = { kinds : [ EVENT_KIND ], since : now(), '#p' : [ this.pubkey ] }
    // Create the subscription parameters.
    const params : SubscribeManyParams = {
      id      : this._sub_id,
      onevent : this._handler.bind(this),
      oneose  : this._eose.bind(this),
      onclose : this._close.bind(this)
    }
    // Subscribe to the relays.
    this._pool.subscribe(this.relays, filter, params)
  }

  async connect (relays? : string[]) : Promise<void> {
    // Set the timeout.
    const timeout = this.config.timeout
    // Subscribe to the relays.
    this.subscribe(relays)
    // If the client is ready, return.
    if (this._ready) return
    // Return a promise to resolve when the subscription is established.
    return new Promise((resolve, reject) => {
      // Set the rejection timer.
      const timer = setTimeout(() => reject('timeout'), timeout)
      // If the client is ready, resolve the promise.
      this.within('ready', () => { clearTimeout(timer); resolve() }, timeout)
    })
  }

  /**
   * Closes all relay connections.
   * 
   * @emits close  When all connections are terminated
   */
  async close () : Promise<void> {
    // If the client is ready,.
    if (this._ready) {
      // Destroy the pool.
      this._pool.destroy()
      // Set the client to not ready.
      this._ready = false
    }
    // Emit the close event.
    this.emit('closed')
  }

  /**
   * Pings a recipient.
   * @param recipient  The recipient of the ping.
   * @returns          True if the recipient pings back, false otherwise.
   */
  async ping (recipient : string) : Promise<boolean> {
    // Create the ping template.
    const tmpl = { method: 'ping', id: gen_message_id() }
    // Emit the ping event.
    this.emit('ping', recipient)
    // Send the ping message.
    return this.request(tmpl, recipient)
      .then(res => {
        if (res.type === 'accept') {
          this.emit('pong', recipient)
          return true
        }
        return false
      })
  }

  /**
   * Sends a request to a recipient.
   * @param message      The request message.
   * @param recipient    The recipient of the request.
   * @returns            The response message.
   */
  async request (
    template  : Partial<RequestTemplate>,
    recipient : string,
    relays?   : string[]
  ) : Promise<ResponseMessage> {
    // Set the timeout.
    const timeout = this.config.timeout
    // Create the request template.
    const config  = { ...template, id: template.id ?? gen_message_id() }
    // Create the request template.
    const tmpl    = create_request_template(config)
    // Create the promise to resolve the response.
    const receipt = new Promise<ResponseMessage>((resolve, reject) => {
      // Set the expiration timer.
      const timer = setTimeout(() => reject('timeout'), timeout)
      // Wait for the response.
      this.within('response', (msg : ResponseMessage) => {
        // If the message ID matches the request ID,
        if (msg.id === tmpl.id) {
          // Clear the timeout and resolve the promise.
          clearTimeout(timer)
          resolve(msg)
        }
      }, timeout)
    })
    // Send the request.
    this.send(tmpl, recipient, relays)
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
  async accept (
    id      : string,
    pubkey  : string,
    result  : string,
    relays? : string[]
  ) : Promise<PublishReceipt> {
    // Create the response template.
    const tmpl = create_accept_template({ id, result })
    // Emit the accept event.
    this.emit('accept', tmpl, pubkey)
    // Send the response.
    return this.send(tmpl, pubkey, relays)
  }

  /**
   * Send a rejection to a request.
   * @param id       The message ID.
   * @param pubkey   The recipient's public key.
   * @param reason   The reason for the rejection.
   * @returns        The published event.
   */
  async reject (
    id      : string,
    pubkey  : string,
    reason  : string,
    relays? : string[]
  ) : Promise<PublishReceipt> {
    // Create the rejection template.
    const tmpl = create_reject_template({ id, error: reason })
    // Emit the reject event.
    this.emit('reject', tmpl, pubkey)
    // Send the rejection.
    return this.send(tmpl, pubkey, relays)
  }

  private async send (
    template  : MessageTemplate,
    recipient : string,
    relays    : string[] = this.relays
  ) : Promise<PublishReceipt> {
    // Assert that the client is ready.
    Assert.ok(this.is_ready, 'client is not connected')
    // Subscribe to the relays if needed.
    await this.subscribe(relays)
    // Create the event.
    const event = await this._notarize(template, recipient)
    // Emit the event to the client emitter.
    this.emit('published', event)
    // Collect the publication promises.
    const promises = this._pool.publish(relays, event)
    // Wait for the publication promises to settle.
    const settled  = await Promise.allSettled(promises)
    // Parse the receipts.
    const receipts = parse_receipts(settled)
    // Create the response.
    const response : PublishReceipt = { ...receipts, event }
    // Emit the sent event.
    this.emit('sent', response)
    // Return the response.
    return response
  }

  /**
   * Subscribes to a list of relays.
   * @param relays  The list of relays to subscribe to.
   * @returns       A promise to resolve with the subscription ID.
   */
  async subscribe (relays : string[] = []) : Promise<void> {
    // If the client already has the relays and is ready, return.
    if (has_relays(this, relays) && this._ready) return
    // Update the relays.
    relays.forEach(relay => this._relays.add(relay))
    // Set the timeout.
    const timeout = this.config.timeout
    // Update the subscription.
    this._subscribe()
    // Return a promise to resolve when the subscription is established.
    return new Promise((resolve, reject) => {
      // Set the rejection timer.
      const timer = setTimeout(() => reject('timeout'), timeout)
      // If the client is ready, resolve the promise.
      this.within('subscribed', () => {
        // Clear the timeout.
        clearTimeout(timer)
        // Resolve the promise.
        resolve()
      }, timeout)
    })
  }
}

/**
 * Merges provided options with default node configuration.
 * @param opt      Custom configuration options
 * @returns        Complete node configuration
 */
function get_node_config (
  opt : ClientOptions = {}
) : ClientConfig {
  return parse_config({ ...DEFAULT_CONFIG(), ...opt })
}

function get_sub_id (pubkey : string) : string {
  const tag_bytes = Buff.str(DOMAIN_TAG)
  const pk_bytes  = Buff.hex(pubkey)
  return hash256(tag_bytes, pk_bytes).hex
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

function has_relays (client : NostrClient, relays : string[] = []) : boolean {
  return relays.every(relay => client.relays.includes(relay))
}

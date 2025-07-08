import { EventEmitter }   from '@/class/emitter.js'
import { RequestQueue }   from '@/class/request.js'
import { SessionManager } from '@/class/session.js'
import { NostrSocket }    from '@/class/socket.js'

import {
  SignerDeviceAPI,
  SignerClientOptions,
  ClientEventMap
} from '@/types/index.js'

export class SignerClient extends EventEmitter<ClientEventMap> {

  private readonly _request : RequestQueue
  private readonly _session : SessionManager
  private readonly _signer  : SignerDeviceAPI
  private readonly _socket  : NostrSocket

  constructor (
    signer  : SignerDeviceAPI,
    options : SignerClientOptions = {}
  ) {
    super()
    // Set the signer.
    this._signer  = signer
    // Set the socket.
    this._socket  = new NostrSocket(this._signer, options)
    // Set the request queue.
    this._request = new RequestQueue(this._socket, options.queue_timeout)
    // Set the session manager.
    this._session = new SessionManager(this._socket, options)

    // Pipe the socket request messages to the session manager.
    this._socket.on('request', this._session.handler.bind(this._session))
    // Pipe the authorized request messages to the request queue.
    this._session.on('request', this._request.handler.bind(this._request))
    // Pipe the policy updates from the request queue to the session manager.
    this._request.on('update', this._session.update.bind(this._session))

    // Send all request denial events directly into rejection.
    this._request.on('deny', this._request.reject.bind(this._request))

    // Hook into the request, session, and socket global events.
    this._request.on('*', this.emit.bind(this, '/request'))
    this._session.on('*', this.emit.bind(this, '/session'))
    this._socket.on('*',  this.emit.bind(this, '/socket'))
  }

  get pubkey () : string {
    return this._socket.pubkey
  }

  get request () : RequestQueue {
    return this._request
  }

  get session () : SessionManager {
    return this._session
  }

  get signer () : SignerDeviceAPI {
    return this._signer
  }

  get socket () : NostrSocket {
    return this._socket
  }

  async connect (relays? : string[]) {
    // Connect to the relays.
    await this._socket.connect(relays)
    // Emit the ready event.
    this.emit('ready')
  }

  close () {
    // Close the socket.
    this._socket.close()
    // Emit the closed event.
    this.emit('closed')
  }
}

import { EventEmitter } from '@/class/emitter.js'
import { NostrSocket }  from '@/class/socket.js'

import {
  RequestQueue,
  SessionManager,
  SignerDeviceAPI,
  SignerClientOptions,
  InviteToken,
  AgentSession,
  PermissionRequest,
  PermissionPolicy
} from '@/index.js'

export class SignerClient extends EventEmitter {

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
    this._request = new RequestQueue(this._socket, options)
    // Set the session manager.
    this._session = new SessionManager(this._socket, options)
    // Pipe the socket request messages to the session manager.
    this._socket.on('request', this._session.handler.bind(this._session))
    // Pipe the authorized request messages to the request queue.
    this._session.on('request', this._request.handler.bind(this._request))
    // Pipe the policy updates from the request queue to the session manager.
    this._request.on('update', this._session.update.bind(this._session))
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

  connect (invite : InviteToken) : Promise<AgentSession> {
    return this._session.connect(invite)
  }

  close () {
    this._socket.close()
  }

  on_approve (fn : (req : PermissionRequest) => void) {
    this._request.on('approve', fn)
  }

  on_prompt (fn : (req : PermissionRequest) => void) {
    this._request.on('prompt', fn)
  }

  approve (
    request  : PermissionRequest,
    result   : string,
    changes? : Partial<PermissionPolicy>
  ) {
    this._request.approve(request, result, changes)
  }

  deny (
    request  : PermissionRequest,
    reason   : string,
    changes? : Partial<PermissionPolicy>
  ) {
    this._request.deny(request, reason, changes)
  }

}

import { EventEmitter }         from '@/class/emitter.js'
import { Assert }               from '@vbyte/micro-lib/assert'
import { now }                  from '@vbyte/micro-lib/util'
import { NostrClient }          from '@/class/client.js'
import { SessionManager }       from '@/class/session.js'

import type {
  PermissionPolicy,
  RequestMessage,
  SessionToken
} from '@/types/index.js'

interface PermissionRequest {
  method  : string
  params  : any[]
  session : SessionToken
}

const DEFAULT_CONFIG : () => Record<string, any> = () => {
  return {
    timeout : 30,
  }
}

export class RequestManager extends EventEmitter {
  private readonly _config  : Record<string, any>
  private readonly _client  : NostrClient
  private readonly _queue   : Map<string, PermissionRequest> = new Map()
  private readonly _session : SessionManager
  private readonly _timers  : Map<string, NodeJS.Timeout>    = new Map()

  constructor (
    client  : NostrClient,
    session : SessionManager,
    options : Record<string, any> = {}
  ) {
    super()
    this._config  = { ...DEFAULT_CONFIG(), ...options }
    // Set the client.
    this._client  = client
    // Set the session manager.
    this._session = session
    // Handle the request messages.
    this._session.on('request', this._handler.bind(this))
  }

  get config () : Record<string, any> {
    return this._config
  }

  get queue () : PermissionRequest[] {
    return Array.from(this._queue.values())
  }

  _handler (req : RequestMessage) {
    try {
      // Create a permission request.
      // Add it to the queue.
      // Add a timer to auto-reject the request.
      // Emit the request on the bus.
    } catch (err) {
      // Emit the error to the client.
      this.emit('error', err)
    }
  }

  approve (
    req     : PermissionRequest,
    changes : Partial<PermissionPolicy>
  ) {
    // We need a way to update the policy based on the answers here.
  }

  reject (
    req     : PermissionRequest,
    changes : Partial<PermissionPolicy>
  ) {
    // Get the session token.
    const session = this._session.get(req.session.pubkey)
    // If the session is not found, return early.
    if (!session) return
    // Reject the request.
    session.reject(req.method, req.params)
  }

}
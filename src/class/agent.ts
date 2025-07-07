import { Assert }         from '@vbyte/micro-lib/assert'
import { now }            from '@vbyte/micro-lib/util'
import { EventEmitter }   from '@/class/emitter.js'
import { InviteManager }  from '@/class/invite.js'
import { NostrSocket }    from '@/class/socket.js'
import { DEFAULT_POLICY } from '@/lib/perms.js'

import type {
  InviteToken,
  SignerAgentConfig,
  SignerAgentOptions,
  AgentEventMap,
  DeviceSession,
  SignerDeviceAPI,
  SocketOptions
} from '@/types/index.js'


const DEFAULT_CONFIG : () => SignerAgentConfig = () => {
  return {
    host_policy    : DEFAULT_POLICY(),
    host_profile   : {},
    invite_timeout : 30
  }
}

export class SignerAgent extends EventEmitter<AgentEventMap> {

  private readonly _config : SignerAgentConfig
  private readonly _invite : InviteManager
  private readonly _signer : SignerDeviceAPI
  private readonly _socket : NostrSocket

  private _session : DeviceSession | null = null

  constructor (
    signer  : SignerDeviceAPI,
    options : SignerAgentOptions & SocketOptions = {}
  ) {
    super()
    // Set the signer.
    this._signer = signer
    // Set the socket.
    this._socket = new NostrSocket(this._signer, options)
    // Set the configuration.
    this._config = get_agent_config(options)
    // Set the invite manager.
    this._invite = new InviteManager(this._socket, this._config.invite_timeout)
    // Handle the request messages.
    this._socket.on('response', this._invite.handler.bind(this._invite))
    // Handle the invite messages.
    this._invite.on('join', (event) => {
      this._session = { ...event, created_at : now() }
      this.emit('join', this._session)
    })
  }

  get config () : SignerAgentConfig {
    return this._config
  }

  get pubkey () : string {
    return this._socket.pubkey
  }

  get ready () : boolean {
    return this._session !== null
  }

  get session () : DeviceSession | null {
    return this._session
  }

  get socket () : NostrSocket {
    return this._socket
  }

  async connect (token : InviteToken) : Promise<DeviceSession> {
    // Define the connection timeout.
    const timeout = this._config.invite_timeout * 1000
    // Subscribe to the relays.
    this._socket.subscribe(token.relays)
    // Return a promise to resolve the session.
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        clearTimeout(timer)
        reject(new Error('invite timeout'))
      }, timeout)
      this.within('join', (event) => {
        if (event.secret === token.secret) {
          clearTimeout(timer)
          resolve(event)
        }
      }, timeout)
    })
  }

  close () {
    this._session = null
    this._socket.close()
    this.emit('close')
  }

  async invite (relays? : string[]) : Promise<InviteToken> {
    relays = [ ...this._socket.relays, ...(relays ?? [])]
    // Create a new connection token.
    await this._socket.subscribe(relays)
    // Return the connection token with the secret.
    const token = this._invite.create(this.config)
    // Emit the invite event.
    this.emit('invite', token)
    // Return the connection token with the secret.
    return token
  }

  request (method : string, params : any[]) {
    Assert.exists(this._session, 'device not connected to agent')
    return this._socket.request({ method, params }, this._session.pubkey)
  }
}

function get_agent_config (
  options : SignerAgentOptions
) : SignerAgentConfig {
  const { device, ...rest } = options
  return { ...DEFAULT_CONFIG(), ...rest }
}

import { Assert }         from '@vbyte/micro-lib/assert'
import { now }            from '@vbyte/micro-lib/util'
import { EventEmitter }   from '@/class/emitter.js'
import { InviteManager }  from '@/class/invite.js'
import { NostrSocket }    from '@/class/socket.js'
import { DEFAULT_POLICY } from '@/const.js'

import type {
  SignerAgentConfig,
  SignerAgentOptions,
  AgentSession,
  SignerDeviceAPI,
  SocketOptions,
  ClientEventMap
} from '@/types/index.js'

const DEFAULT_CONFIG : () => SignerAgentConfig = () => {
  return {
    policy  : DEFAULT_POLICY(),
    profile : {},
    timeout : 30
  }
}

export class SignerAgent extends EventEmitter<ClientEventMap> {

  private readonly _config : SignerAgentConfig
  private readonly _invite : InviteManager
  private readonly _signer : SignerDeviceAPI
  private readonly _socket : NostrSocket

  private _session : AgentSession | null = null

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
    this._invite = new InviteManager(this._socket, this._config.timeout)
    // Handle the request messages.
    this._socket.on('response', this._invite.handler.bind(this._invite))
    // Handle the invite messages.
    this._invite.on('join', (event) => {
      this._session = { ...event, created_at : now() }
      this.emit('ready')
    })
  }

  get config () : SignerAgentConfig {
    return this._config
  }

  get invite () : InviteManager {
    return this._invite
  }

  get pubkey () : string {
    return this._socket.pubkey
  }

  get ready () : boolean {
    return this._session !== null
  }

  get session () : AgentSession {
    Assert.exists(this._session, 'device not connected to agent')
    return this._session
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
    // Set the session to null.
    this._session = null
    // Close the socket.
    this._socket.close()
    // Emit the closed event.
    this.emit('close')
  }

  request (method : string, params? : string[]) {
    return this._socket.request({ method, params }, this.session.pubkey)
  }
}

function get_agent_config (
  options : SignerAgentOptions
) : SignerAgentConfig {
  const { session, ...rest } = options
  return { ...DEFAULT_CONFIG(), ...rest }
}

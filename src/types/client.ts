import type { RequestQueueOptions }   from './request.js'
import type { SessionManagerOptions } from './session.js'
import type { SocketOptions }         from './socket.js'

export type SignerClientOptions = SocketOptions & SessionManagerOptions & RequestQueueOptions
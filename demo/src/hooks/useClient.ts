import { useState, useEffect } from 'react'
import { decrypt_secret }      from '@/demo/lib/crypto.js'
import { useLogs }             from '@/demo/context/logs.js'
import { useStore }            from '@/demo/context/store.js'

import {
  CONST,
  NostrSocket,
  SimpleSigner,
  SessionManager,
  RequestQueue
} from '@/source'

import type {
  ClientController,
  ClientState,
  ClientStatus,
  LogEntry,
  LogType,
} from '@/demo/types/index.js'

import type { RequestMessage, AgentSession } from '@/types/index.js'

const SIGN_METHOD = CONST.AUTH_METHOD

export function useClient () : ClientController {
  // Configure the client hook state.
  const [ status, setStatus ] = useState<ClientStatus>('loading')
  const [ client, setClient ] = useState<ClientState | null>(null)
  // Configure the store and logs context.
  const store = useStore()
  const logs  = useLogs()

  const lock = () => {
    setClient(null)
    setStatus('locked')
  }

  // Reset the client.
  const reset = () => {
    // If the client is not initialized, return early.
    if (!client) return
    // Clear logs when resetting client state.
    logs.clearLogs()
    // Get the relay urls.
    const urls = store.data.relays.map(r => r.url)
    // Subscribe to the relays.
    client.socket.subscribe(urls)
  }

  const unlock = (password : string) => {
    // If the client is already initialized, return early.
    if (client) return
    // Clear logs when resetting client state.
    logs.clearLogs()
    // Get the store data.
    const { encrypted, relays, sessions } = store.data
    // Get the relay urls.
    const urls = new Set([
      ...relays.map(r => r.url),
      ...sessions.flatMap(s => s.relays)
    ])
    // If no encrypted secret is provided, return early.
    if (!encrypted) return
    // Get the seckey from the encrypted secret.
    const seckey = decrypt_secret(encrypted, password)
    // Create a new signer device.
    const signer = new SimpleSigner(seckey)
    // Create a new client.
    const socket = new NostrSocket(signer, {
      relays : Array.from(urls)
    })
    // Create a new session manager.
    const session = new SessionManager(socket, {
      sessions,
      timeout : 10000
    })
    // Create a new request manager.
    const request = new RequestQueue(socket, session, {
      timeout : 10000
    })
    // Handle the ready event.
    const handleReady = () => {
      console.log('client initialized')
      setStatus('online')
    }
    // Handle closed events.
    const handleClosed = () => setStatus('offline')
    // Handle error events.
    const handleError  = () => setStatus('offline')

    // Handle session changes.
    const handleSessionChange = () => {
      const updated = session.active ?? []
      store.update({ sessions: updated })
    }

    // Catch-all handler for logging event activity.
    const handleAllEvents = (source : string, event: string, data: any, error? : string) => {
      // Skip note events and message events.
      if (event === 'event')   return
      if (event === 'message') return
      // Log the event and data.
      console.log('event:', event, 'data:', data)
      // Get the log entry.
      const log_entry = get_log_entry(source, event, data, error)
      // Add log entry using logs context
      logs.addLog(log_entry)
    }

    // Attach all event listeners
    socket.on('ready',   handleReady)
    socket.on('closed',  handleClosed)
    socket.on('error',   handleError)
    socket.on('*',       (event, data, error) => handleAllEvents('socket', event, data, error))

    session.on('activated', handleSessionChange)
    session.on('revoked',   handleSessionChange)
    session.on('updated',   handleSessionChange)
    session.on('request',   (message, session)   => request_handler(socket, signer, message, request, session))
    session.on('*',         (event, data, error) => handleAllEvents('session', event, data, error))

    if (socket.relays.length > 0) {
      socket.subscribe()
      setStatus('connecting')
    } else {
      setStatus('offline')
    }

    // Set the client.
    setClient({ request, session, signer, socket })
  }

  // Lock the client when the encrypted secret changes.
  useEffect(() => {
    lock()
  }, [ store.data.encrypted ])

  // Subscribe to new relays when the relay list changes.
  useEffect(() => {
    if (client) {
      const urls = store.data.relays.map(r => r.url)
      client.socket.subscribe(urls)
    }
  }, [ store.data.relays ])

  return { ...client, unlock, reset, lock, status } as ClientController
}

async function request_handler (
  socket  : NostrSocket,
  signer  : SimpleSigner,
  message : RequestMessage,
  request : RequestQueue,
  session : AgentSession  
) {
  // Get the methods from the signer.
  const methods = signer.get_methods()
  // Get the session permissions.
  const perms   = session.policy ?? {}
  // Get the reject function.
  const reject  = reject_handler(socket, message)
  // If the method is not supported, return early.
  if (!methods.includes(message.method)) return reject('method not supported: ' + message.method)
  // If the session does not have permissions, return early.
  if (perms.methods[message.method] === false) return reject('session does not have permissions: ' + message.method)
  if (perms.methods[message.method] === undefined) {
    request.handler(message)
  }
  // Try to handle the request.
  try {
    if (message.method === SIGN_METHOD.SIGN_EVENT) {
      // Get the event.
      const json = message?.params?.at(0)
      // If the event is not a string, return early.
      if (!json) return
      // Parse the event.
      const event  = JSON.parse(json)
      // If the event kind is not in the event permissions, return early.
      if (perms.kinds[event.kind] === false) return reject('event kind not allowed: ' + event.kind)
      // Sign the event.
      const signed = await signer.sign_event(event)
      // Respond to the request.
      socket.accept(message.id, message.env.pubkey, JSON.stringify(signed))
    }
    if (message.method === SIGN_METHOD.NIP04_DECRYPT) {
      const peer_pubkey = message?.params?.at(0)
      const ciphertext  = message?.params?.at(1)
      if (!peer_pubkey || !ciphertext) return
      const decrypted = await signer.nip04_decrypt(peer_pubkey, ciphertext)
      socket.accept(message.id, message.env.pubkey, decrypted)
    }
    if (message.method === SIGN_METHOD.NIP04_ENCRYPT) {
      const peer_pubkey = message?.params?.at(0)
      const plaintext   = message?.params?.at(1)
      if (!peer_pubkey || !plaintext) return
      const encrypted = await signer.nip04_encrypt(peer_pubkey, plaintext)
      socket.accept(message.id, message.env.pubkey, encrypted)
    }
    if (message.method === SIGN_METHOD.NIP44_DECRYPT) {
      const peer_pubkey = message?.params?.at(0)
      const ciphertext  = message?.params?.at(1)
      if (!peer_pubkey || !ciphertext) return
      const decrypted = await signer.nip44_decrypt(peer_pubkey, ciphertext)
      socket.accept(message.id, message.env.pubkey, decrypted)
    }
    if (message.method === SIGN_METHOD.NIP44_ENCRYPT) {
      const peer_pubkey = message?.params?.at(0)
      const plaintext   = message?.params?.at(1)
      if (!peer_pubkey || !plaintext) return
      const encrypted = await signer.nip44_encrypt(peer_pubkey, plaintext)
      socket.accept(message.id, message.env.pubkey, encrypted)
    }
  } catch (error) {
    console.error('Error handling request:', error)
    reject('error handling request')
  }
}

function reject_handler (
  socket  : NostrSocket,
  message : RequestMessage,
) {
  return (reason : string) => {
    socket.reject(message.id, message.env.pubkey, reason)
  }
}

function get_log_entry (
  source : string,
  event  : string,
  data   : any,
  error? : string
) : LogEntry {
  // Define the log type, message, and payload.
  let type    : LogType = 'info'
  let message : string  = String(event)
  let payload : any     = data
  // Determine log type based on event
  if (message.toLowerCase() === 'ready') {
    type    = 'ready'
    message = 'client ready'
    payload = undefined
  } else if (message.startsWith('closed')) {
    type    = 'info'
    message = 'connection closed'
    payload = undefined
  } else if (message.startsWith('subscribed')) {
    type    = 'info'
    message = 'subscribed to relays'
  } else if (message.startsWith('error')) {
    type    = 'error'
    message = 'client error'
  } else if (message.startsWith('bounced')) {
    type    = 'error'
    message = 'message bounced: ' + error
  }

  // Clean up empty payloads
  if (typeof payload === 'object' && payload !== null && Object.keys(payload).length === 0) {
    payload = undefined
  }

  // Create a new log entry.
  return {
    source,
    timestamp : Date.now(),
    message   : message,
    type      : type,
    payload   : payload
  }
}
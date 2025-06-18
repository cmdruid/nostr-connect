import { getPublicKey } from 'nostr-tools'

import { NostrClient, SimpleSigner, CONST, SessionManager } from '@/source'

import { decrypt_secret } from '@/demo/lib/crypto.js'
import { useLogs }        from '@/demo/context/logs.js'
import { useStore }       from '@/demo/context/store.js'

import { useState, useEffect } from 'react'

import type {
  NodeStatus,
  NostrClientAPI,
  LogEntry,
  LogType
} from '@/demo/types/index.js'

import type { RequestMessage, SessionToken } from '@/types/index.js'

const SIGN_METHOD = CONST.SIGN_METHOD

export function useClient () : NostrClientAPI {
  // Configure the client hook state.
  const [ status,   setStatus  ] = useState<NodeStatus>('locked')
  const [ _client,  setClient  ] = useState<NostrClient | null>(null)
  const [ _session, setSession ] = useState<SessionManager | null>(null)
  
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
    if (!_client) return
    // Clear logs when resetting client state.
    logs.clearLogs()
    // Get the relay urls.
    const urls = store.data.relays.map(r => r.url)
    // Subscribe to the relays.
    _client.subscribe(urls)
  }

  const unlock = (password : string) => {
    // If the client is already initialized, return early.
    if (_client) return
    // Clear logs when resetting client state.
    logs.clearLogs()
    // Get the store data.
    const { encrypted, relays, sessions } = store.data
    console.log('relays', relays)
    console.log('sessions', sessions)
    // Get the relay urls.
    const urls = new Set([
      ...relays.map(r => r.url),
      ...sessions.flatMap(s => s.relays)
    ])
    console.log('urls', urls)
    console.log('flat:', sessions.flatMap(s => s.relays))
    // If no encrypted secret is provided, return early.
    if (!encrypted) return
    // Get the seckey from the encrypted secret.
    const seckey = decrypt_secret(encrypted, password)
    // Get the pubkey from the seckey.
    const pubkey = getPublicKey(seckey)
    // Create a new signer device.
    const signer = new SimpleSigner(seckey)
    // Create a new client.
    const client = new NostrClient(pubkey, signer, {
      debug  : false,
      relays : Array.from(urls)
    })
    // Create a new session manager.
    const session = new SessionManager(client, {
      sessions,
      debug   : false,
      timeout : 10000,
      verbose : false
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

    // Handle request events.
    const handleRequest = async (
      message : RequestMessage,
      session : SessionToken  
    ) => {
      // Get the methods from the signer.
      const methods = signer.get_methods()
      // Get the session permissions.
      const perms   = session.perms ?? {}
      // Get the reject function.
      const reject  = reject_handler(client, message)
      // If the method is not supported, return early.
      if (!methods.includes(message.method)) return reject('method not supported: ' + message.method)
      // If the session does not have permissions, return early.
      if (!perms[message.method]) return reject('session does not have permissions: ' + message.method)
      // Try to handle the request.
      try {
        if (message.method === SIGN_METHOD.SIGN_EVENT) {
          // Get the event permissions.
          const event_perms = perms.sign_event
          // If the event permissions are not an array, return early.
          if (!Array.isArray(event_perms)) return reject('event permissions missing')
          // Get the event.
          const json = message.params.at(0)
          // If the event is not a string, return early.
          if (!json) return
          // Parse the event.
          const event  = JSON.parse(json)
          // If the event kind is not in the event permissions, return early.
          if (!event_perms.includes(event.kind)) return reject('event kind not allowed: ' + event.kind)
          // Sign the event.
          const signed = await signer.sign_event(event)
          // Respond to the request.
          client.respond(message.id, message.env.pubkey, JSON.stringify(signed))
        }
        if (message.method === SIGN_METHOD.NIP04_DECRYPT) {
          const peer_pubkey = message.params.at(0)
          const ciphertext = message.params.at(1)
          if (!peer_pubkey || !ciphertext) return
          const decrypted = await signer.nip04_decrypt(peer_pubkey, ciphertext)
          client.respond(message.id, message.env.pubkey, decrypted)
        }
        if (message.method === SIGN_METHOD.NIP04_ENCRYPT) {
          const peer_pubkey = message.params.at(0)
          const plaintext = message.params.at(1)
          if (!peer_pubkey || !plaintext) return
          const encrypted = await signer.nip04_encrypt(peer_pubkey, plaintext)
          client.respond(message.id, message.env.pubkey, encrypted)
        }
        if (message.method === SIGN_METHOD.NIP44_DECRYPT) {
          const peer_pubkey = message.params.at(0)
          const ciphertext = message.params.at(1)
          if (!peer_pubkey || !ciphertext) return
          const decrypted = await signer.nip44_decrypt(peer_pubkey, ciphertext)
          client.respond(message.id, message.env.pubkey, decrypted)
        }
        if (message.method === SIGN_METHOD.NIP44_ENCRYPT) {
          const peer_pubkey = message.params.at(0)
          const plaintext = message.params.at(1)
          if (!peer_pubkey || !plaintext) return
          const encrypted = await signer.nip44_encrypt(peer_pubkey, plaintext)
          client.respond(message.id, message.env.pubkey, encrypted)
        }
      } catch (error) {
        console.error('Error handling request:', error)
        reject('error handling request')
      }
    }

    // Catch-all handler for logging event activity.
    const handleAllEvents = (event: string, data: any, error? : string) => {
      // Skip note events and message events.
      if (event === 'event')   return
      if (event === 'message') return
      // Log the event and data.
      console.log('event:', event, 'data:', data)
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
      const log_entry: LogEntry = {
        timestamp : Date.now(),
        message   : message,
        type      : type,
        payload   : payload
      }

      // Add log entry using logs context
      logs.addLog(log_entry)
    }

    // Attach all event listeners
    client.on('ready',   handleReady)
    client.on('closed',  handleClosed)
    client.on('error',   handleError)
    client.on('*',       handleAllEvents)

    session.on('activated', handleSessionChange)
    session.on('revoked',   handleSessionChange)
    session.on('updated',   handleSessionChange)
    session.on('request',   handleRequest)

    if (client.relays.length > 0) {
      client.subscribe()
      setStatus('connecting')
    } else {
      setStatus('offline')
    }

    // Set the client.
    setClient(client)
    setSession(session)
  }

  // Lock the client when the encrypted secret changes.
  useEffect(() => {
    lock()
  }, [ store.data.encrypted ])

  // Subscribe to new relays when the relay list changes.
  useEffect(() => {
    if (_client) {
      const urls = store.data.relays.map(r => r.url)
      _client.subscribe(urls)
    }
  }, [ store.data.relays ])

  // Return the client hook API.
  return { client : _client, session : _session, unlock, reset, lock, status }
}

function reject_handler (
  node : NostrClient,
  message : RequestMessage,
) {
  return (reason : string) => {
    node.reject(message.id, message.env.pubkey, reason)
  }
}
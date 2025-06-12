import { getPublicKey }   from 'nostr-tools'
import { NIP46Client }    from '@/class/client.js'
import { SignerDevice }   from '@/class/signer.js'
import { decrypt_secret } from '@/demo/lib/crypto.js'
import { useLogs }        from '@/demo/context/logs.js'
import { useStore }       from '@/demo/context/store.js'

import { useState, useMemo, useEffect } from 'react'

import type {
  AppStore,
  NodeStatus,
  NostrClientAPI,
  LogEntry,
  LogType
} from '@/demo/types/index.js'

import type { RequestMessage, SessionToken } from '@/types/index.js'

export function useClient () : NostrClientAPI {
  // Configure the client hook state.
  const [ status, setStatus ] = useState<NodeStatus>('locked')
  const [ client, setClient ] = useState<NIP46Client | null>(null)
  
  // Configure the store and logs context.
  const store = useStore()
  const logs  = useLogs()
  
  // Only recreate client when core config changes.
  const config_key = useMemo(() =>
    `${store.data.encrypted}-${store.data.relays.map(r => r.url).join(',')}`
  , [ store.data.encrypted, store.data.relays ])

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
    client.subscribe(urls)
  }

  const unlock = (password : string) => {
    // If the client is already initialized, return early.
    if (client) return
    // Clear logs when resetting client state.
    logs.clearLogs()
    // Get the store data.
    const { encrypted, relays, sessions } = store.data
    // Get the relay urls.
    const urls = relays.map(r => r.url)
    // If no encrypted secret is provided, return early.
    if (!encrypted) return
    // If no relays are provided, return early.
    if (relays.length === 0) return
    // Get the seckey from the encrypted secret.
    const seckey = decrypt_secret(encrypted, password)
    // Get the pubkey from the seckey.
    const pubkey = getPublicKey(seckey)
    // Create a new signer device.
    const signer = new SignerDevice(seckey)
    // Create a new client.
    const node = new NIP46Client(pubkey, signer, {
      debug    : false,
      relays   : urls,
      sessions : sessions
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
      const updated = node.session.active ?? []
      store.update({ sessions: updated })
    }

    // Handle request events.
    const handleRequest = async (
      message : RequestMessage,
      session : SessionToken
    ) => {
      // Get the methods from the signer.
      const methods = await signer.get_methods()
      // Get the session permissions.
      const perms   = session.perms ?? {}
      // Get the reject function.
      const reject  = reject_handler(node, message)
      // If the method is not supported, return early.
      if (!methods[message.method]) return reject('method not supported: ' + message.method)
      // If the session does not have permissions, return early.
      if (!perms[message.method]) return reject('session does not have permissions: ' + message.method)
      // Try to handle the request.
      try {
        if (message.method === methods.sign_event) {
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
          node.respond(message.id, message.env.pubkey, JSON.stringify(signed))
        }
        if (message.method === methods.nip04_decrypt) {
          const peer_pubkey = message.params.at(0)
          const ciphertext = message.params.at(1)
          if (!peer_pubkey || !ciphertext) return
          const decrypted = await signer.nip04_decrypt(peer_pubkey, ciphertext)
          node.respond(message.id, message.env.pubkey, decrypted)
        }
        if (message.method === methods.nip04_encrypt) {
          const peer_pubkey = message.params.at(0)
          const plaintext = message.params.at(1)
          if (!peer_pubkey || !plaintext) return
          const encrypted = await signer.nip04_encrypt(peer_pubkey, plaintext)
          node.respond(message.id, message.env.pubkey, encrypted)
        }
        if (message.method === methods.nip44_decrypt) {
          const peer_pubkey = message.params.at(0)
          const ciphertext = message.params.at(1)
          if (!peer_pubkey || !ciphertext) return
          const decrypted = await signer.nip44_decrypt(peer_pubkey, ciphertext)
          node.respond(message.id, message.env.pubkey, decrypted)
        }
        if (message.method === methods.nip44_encrypt) {
          const peer_pubkey = message.params.at(0)
          const plaintext = message.params.at(1)
          if (!peer_pubkey || !plaintext) return
          const encrypted = await signer.nip44_encrypt(peer_pubkey, plaintext)
          node.respond(message.id, message.env.pubkey, encrypted)
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
    node.on('ready',   handleReady)
    node.on('closed',  handleClosed)
    node.on('error',   handleError)
    node.on('request', handleRequest)
    node.on('*',       handleAllEvents)
    node.session.on('activated', handleSessionChange)
    node.session.on('revoked',   handleSessionChange)
    node.session.on('updated',   handleSessionChange)

    // Start the connection
    node.subscribe()
    // Set the client.
    setClient(node)
  }

  // Lock the client when the encrypted secret changes.
  useEffect(() => {
    lock()
  }, [ store.data.encrypted ])

  // Subscribe to new relays when the relay list changes.
  useEffect(() => {
    if (client) {
      const urls = store.data.relays.map(r => r.url)
      client.subscribe(urls)
    }
  }, [ store.data.relays ])

  // Return the client hook API.
  return { ref : client, unlock, reset, lock, status }
}

function reject_handler (
  node : NIP46Client,
  message : RequestMessage,
) {
  return (reason : string) => {
    node.reject(message.id, message.env.pubkey, reason)
  }
}
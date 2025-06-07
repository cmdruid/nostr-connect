import { Buff }         from '@cmdcode/buff'
import { NIP46Client }  from '@/class/client.js'
import { SignerDevice } from '@/class/signer.js'
import { getPublicKey } from 'nostr-tools'
import { useStore }     from '@/demo/context/store.js'
import { useLogs }      from '@/demo/context/logs.js'
import { REQ_METHOD }   from '@/const.js'

import { useEffect, useState, useMemo } from 'react'

import type {
  AppStore,
  NodeStatus,
  ClientAPI,
  LogEntry,
  LogType
} from '@/demo/types/index.js'

export function useClient () : ClientAPI {
  const [ status, setStatus ] = useState<NodeStatus>('stopped')
  const [ client, setClient ] = useState<NIP46Client | null>(null)
  
  const store = useStore()
  const logs = useLogs()

  // Only recreate client when core config changes
  const configKey = useMemo(() => 
    `${store.data.nsec}-${store.data.relays.map(r => r.url).join(',')}`
  , [ store.data.nsec, store.data.relays ])

  useEffect(() => {
    if (!is_store_ready(store.data)) {
      setStatus('stopped')
      setClient(null)
      return
    }

    // Clear logs when resetting
    logs.clearLogs()

    const { nsec, relays, sessions } = store.data
    const urls = relays.map(r => r.url)
    
    if (!nsec) {
      return
    }

    const seckey = Buff.bech32(nsec)
    const pubkey = getPublicKey(seckey)
    const signer = new SignerDevice(seckey.hex)

    // Create new client
    const node = new NIP46Client(pubkey, signer, {
      debug    : false,
      relays   : urls,
      sessions : sessions
    })

    // Set up event handlers
    const handleReady = () => {
      console.log('client initialized')
      setStatus('online')
    }

    const handleClosed = () => setStatus('offline')
    const handleError  = () => setStatus('offline')

    const handleSessionChange = () => {
      const updated = node.session.active ?? []
      store.update({ sessions: updated })
    }

    const handleRequest = async (message: any) => {
      try {
        if (message.method === REQ_METHOD.SIGN_EVENT) {
          const json = message.params.at(0)
          if (!json) return
          const event = JSON.parse(json)
          const signed = await signer.sign_event(event)
          node.respond(message.id, message.env.pubkey, JSON.stringify(signed))
        }
        if (message.method === REQ_METHOD.NIP04_DECRYPT) {
          const peer_pubkey = message.params.at(0)
          const ciphertext = message.params.at(1)
          if (!peer_pubkey || !ciphertext) return
          const decrypted = await signer.nip04_decrypt(peer_pubkey, ciphertext)
          node.respond(message.id, message.env.pubkey, decrypted)
        }
        if (message.method === REQ_METHOD.NIP04_ENCRYPT) {
          const peer_pubkey = message.params.at(0)
          const plaintext = message.params.at(1)
          if (!peer_pubkey || !plaintext) return
          const encrypted = await signer.nip04_encrypt(peer_pubkey, plaintext)
          node.respond(message.id, message.env.pubkey, encrypted)
        }
        if (message.method === REQ_METHOD.NIP44_DECRYPT) {
          const peer_pubkey = message.params.at(0)
          const ciphertext = message.params.at(1)
          if (!peer_pubkey || !ciphertext) return
          const decrypted = await signer.nip44_decrypt(peer_pubkey, ciphertext)
          node.respond(message.id, message.env.pubkey, decrypted)
        }
        if (message.method === REQ_METHOD.NIP44_ENCRYPT) {
          const peer_pubkey = message.params.at(0)
          const plaintext = message.params.at(1)
          if (!peer_pubkey || !plaintext) return
          const encrypted = await signer.nip44_encrypt(peer_pubkey, plaintext)
          node.respond(message.id, message.env.pubkey, encrypted)
        }
      } catch (error) {
        console.error('Error handling request:', error)
      }
    }

    const handleAllEvents = (event: string, data: any, error? : string) => {
      // Skip message events
      if (event === 'event')   return
      if (event === 'message') return

      console.log('event:', event, 'data:', data)

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
    node.on('ready', handleReady)
    node.on('closed', handleClosed)
    node.on('error', handleError)
    node.session.on('activated', handleSessionChange)
    node.session.on('revoked', handleSessionChange)
    node.on('request', handleRequest)
    node.on('*', handleAllEvents)

    // Start the connection
    node.subscribe()
    setClient(node)

    // Cleanup function
    return () => {
      node.off('ready', handleReady)
      node.off('closed', handleClosed)
      node.off('error', handleError)
      node.session.off('activated', handleSessionChange)
      node.session.off('revoked', handleSessionChange)
      node.off('request', handleRequest)
      node.off('*', handleAllEvents)
      setClient(null)
      setStatus('stopped')
    }
  }, [ configKey ])

  const reset = () => {
    // Force recreation by updating a dependency
    // The useEffect will handle the actual reset
    logs.clearLogs()
  }

  const stop = () => {
    setClient(null)
    setStatus('stopped')
  }

  return {
    ref : client,
    reset,
    stop,
    status
  }
}

function is_store_ready (store : AppStore) {
  return store.nsec !== null && store.relays.length > 0
}

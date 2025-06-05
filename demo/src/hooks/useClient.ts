import { Buff }         from '@cmdcode/buff'
import { NIP46Client }  from '@/class/client.js'
import { SignerDevice } from '@/class/signer.js'
import { getPublicKey } from 'nostr-tools'
import { useStore }     from '@/demo/store/index.js'
import { LOG_LIMIT }    from '@/demo/const.js'

import { useEffect, useRef, useState, useMemo } from 'react'

import type {
  AppStore,
  NodeStatus,
  StoreReady,
  NodeAPI,
  LogEntry,
  LogType
} from '@/demo/types/index.js'
import { REQ_METHOD } from '@/const'

export function useClient () : NodeAPI {
  const [ status, setStatus ] = useState<NodeStatus>('stopped')

  const store     = useStore()
  const node_ref  = useRef<NIP46Client | null>(null)
  const store_ref = useRef(store.data)

  // Keep store_ref in sync with store.data
  useEffect(() => {
    store_ref.current = store.data
  }, [ store.data ])

  const reset = () => {
    if (!is_store_ready(store.data)) return

    // Clear logs when resetting
    store.update({ logs: [] })

    // Get the nsec and relays from the store.
    const { nsec, relays } = store.data

    // Get the URLs from the relays.
    const urls = relays.map(r => r.url)

    if (!nsec) throw new Error('No nsec found')

    const seckey = Buff.bech32(nsec)
    const pubkey = getPublicKey(seckey)
    const signer = new SignerDevice(seckey.hex)

    // Create a new node.
    node_ref.current = new NIP46Client(pubkey, urls, signer)

    node_ref.current.on('ready', () => {
      console.log('client initialized')
      setStatus('online')
    })

    node_ref.current.on('closed', () => {
      setStatus('offline')
    })

    node_ref.current.on('error', (error) => {
      setStatus('offline')
    })

    node_ref.current.on('request', async (message) => {
      if (message.method === REQ_METHOD.SIGN_EVENT) {
        const json   = message.params.at(0)
        if (!json) return
        const event  = JSON.parse(json)
        const signed = await signer.sign_event(event)
        node_ref.current?.respond(message.id, message.env.pubkey, JSON.stringify(signed))
      }
      if (message.method === REQ_METHOD.NIP04_DECRYPT) {
        const peer_pubkey = message.params.at(0)
        const ciphertext  = message.params.at(1)
        if (!peer_pubkey || !ciphertext) return
        const decrypted = await signer.nip04_decrypt(peer_pubkey, ciphertext)
        node_ref.current?.respond(message.id, message.env.pubkey, decrypted)
      }
      if (message.method === REQ_METHOD.NIP04_ENCRYPT) {
        const peer_pubkey = message.params.at(0)
        const plaintext   = message.params.at(1)
        if (!peer_pubkey || !plaintext) return
        const encrypted   = await signer.nip04_encrypt(peer_pubkey, plaintext)
        node_ref.current?.respond(message.id, message.env.pubkey, encrypted)
      }
      if (message.method === REQ_METHOD.NIP44_DECRYPT) {
        const peer_pubkey = message.params.at(0)
        const ciphertext  = message.params.at(1)
        if (!peer_pubkey || !ciphertext) return
        const decrypted = await signer.nip44_decrypt(peer_pubkey, ciphertext)
        node_ref.current?.respond(message.id, message.env.pubkey, decrypted)
      }
      if (message.method === REQ_METHOD.NIP44_ENCRYPT) {
        const peer_pubkey = message.params.at(0)
        const plaintext   = message.params.at(1)
        if (!peer_pubkey || !plaintext) return
        const encrypted   = await signer.nip44_encrypt(peer_pubkey, plaintext)
        node_ref.current?.respond(message.id, message.env.pubkey, encrypted)
      }
    })

    node_ref.current.on('*', (event, data) => {
      // Skip message events.
      console.log('event:', event, 'data:', data)
      if (event === 'message') return

      let type: LogType = 'info' // Default log type
      let message = String(event)
      let payload: any = data

      // Determine log type and refine message based on event string
      if (message.toLowerCase() === 'ready') {
        type    = 'ready'
        payload = undefined // No payload for ready events
      } else if (message.startsWith('/sign')) {
        type = 'sign' // General sign type, can be refined
        if (message.endsWith('/req')) {
          type = 'req'
        } else if (message.endsWith('/res')) {
          type = 'res'
        }
      } else if (message.startsWith('/error')) {
        type = 'error'
      } // Add more specific event type handling as needed

      // If payload is an empty object, set it to undefined so no dropdown is shown
      if (typeof payload === 'object' && payload !== null && Object.keys(payload).length === 0) {
        payload = undefined
      }

      const log_entry: LogEntry = {
        timestamp: Date.now(),
        message: message,
        type: type,
        payload: payload
      }

      // console.log('event:', event, 'data:', data, 'log_entry:', log_entry)
      const logs = update_log(store_ref.current, log_entry)
      store.update({ logs })
    })

    node_ref.current.connect()
  }

  const stop = () => {
    node_ref.current = null
  }

  // Reset node when core configuration changes
  useEffect(() => {
    reset()
  }, [ store.data.nsec, store.data.relays ])

  return useMemo(() => ({
    ref: node_ref,
    reset,
    stop,
    status
  }), [ reset, stop, status ])
}

function is_store_ready (store : AppStore) : store is StoreReady {
  return store.nsec !== null && store.relays.length > 0
}

function update_log (store : AppStore, log : LogEntry) {
  let new_logs = [ ...store.logs, log ]
  if (new_logs.length > LOG_LIMIT) {
    const diff = new_logs.length - LOG_LIMIT
    new_logs = new_logs.slice(diff)
  }
  return new_logs
}

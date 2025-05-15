import { NostrNode }  from '@cmdcode/nostr-p2p'
import { gen_seckey } from '@cmdcode/nostr-p2p/lib'
import { NostrRelay } from '@/test/lib/relay.js'

// Configure the demo.
const alice_sk = gen_seckey()
const bob_sk   = gen_seckey()
const relays   = [ 'ws://localhost:8002' ]

// Create the actors.
const Alice = new NostrNode(relays, alice_sk)
const Bob   = new NostrNode(relays, bob_sk)
const Relay = new NostrRelay(8002)

// Configure the Alice node.
Alice.inbox.tag.on('ping', (msg) => {
  const res = { id: msg.id, tag: 'pong', data: 'pong!' }
  Alice.publish(res, msg.env.pubkey)
})

Alice.on('ready', () => {
  console.log('alice connected')
})

// Configure the Bob node.
Bob.inbox.tag.on('pong', (msg) => {
  console.log('received pong message:', msg.data)
  cleanup()
})

Bob.on('ready', () => {
  console.log('bob connected')
  Bob.publish({ tag: 'ping', data: 'ping!' }, Alice.pubkey)
})

// Cleanup the demo.
const cleanup = () => {
  console.log('cleaning up...')
  Alice.close()
  Bob.close()
  Relay.close()
}

// Start the demo.
Relay.start().then(async () => {
  console.log('relay started')
  await Alice.connect()
  await Bob.connect()
})

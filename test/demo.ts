import { PeerManager, SessionManager } from '@/index.js'

import { create_client } from '@test/lib/client.js'

// Create the actors.
const Alice = create_client('alice')
const Carol = create_client('carol')

const relays = [ 'ws://localhost:8080' ]

const peers    = new PeerManager(Alice)
const sessions = new SessionManager(Carol)

Alice.on('request', (req) => {
  console.log('[ alice ] sent request')
  console.dir(req, { depth: null })
})

Alice.on('response', (res) => {
  console.log('[ alice ] received response')
  console.dir(res, { depth: null })
})

Alice.on('bounced', (event, err) => {
  console.log('[ alice ] bounced event')
  console.dir(event, { depth: null })
  console.dir(err, { depth: null })
})

Alice.on('published', (event) => {
  console.log('[ alice ] published event')
  console.dir(event, { depth: null })
})

Carol.on('request', (req) => {
  console.log('[ carol ] sent request')
  console.dir(req, { depth: null })
})

Carol.on('response', (res) => {
  console.log('[ carol ] received response')
  console.dir(res, { depth: null })
})

Carol.on('bounced', (event, err) => {
  console.log('[ carol ] bounced event')
  console.dir(event, { depth: null })
  console.dir(err, { depth: null })
})

Carol.on('published', (event) => {
  console.log('[ carol ] published event')
  console.dir(event, { depth: null })
})

peers.on('confirmed', (session) => {
  console.log('[ peers ] peer confirmed:', session)

  Alice.request({ method: 'get_public_key' }, Carol.pubkey)
})

sessions.on('pending', (session) => {
  console.log('[ sessions ] session pending:', session)
})

sessions.on('activated', (session) => {
  console.log('[ sessions ] session activated:', session)
})

sessions.on('request', (req, session) => {
  console.log('[ sessions ] session request:', req, session)
})


await Alice.subscribe(relays)
await Carol.subscribe(relays)

const invite = peers.invite('alice', relays)

console.log('alice invite:', invite)

await sessions.connect(invite)

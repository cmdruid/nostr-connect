import { Buff }   from '@vbyte/buff'
import { sha256 } from '@vbyte/micro-lib/hash'

import {
  ConnectToken,
  SignerClient,
  SimpleSigner
} from '@/index.js'

const name   = 'alice'
const relays = [ 'ws://localhost:8080' ]

const seckey = sha256(Buff.str(name)).hex
const signer = new SimpleSigner(seckey)
const client = new NostrClient(signer)
const peers  = new ChannelManager(client)

client.on('request', (req) => {
  console.log('[ alice ] sent request')
  console.dir(req, { depth: null })
})

client.on('response', (res) => {
  console.log('[ alice ] received response')
  console.dir(res, { depth: null })
})

client.on('bounced', (event, err) => {
  console.log('[ alice ] bounced event')
  console.dir(event, { depth: null })
  console.dir(err, { depth: null })
})

client.on('published', (event) => {
  console.log('[ alice ] published event')
  console.dir(event, { depth: null })
})

client.on('request', (req) => {
  console.log('[ carol ] sent request')
  console.dir(req, { depth: null })
})

peers.on('confirmed', (peer) => {
  console.log('[ peers ] peer confirmed:', peer)

  client.request({ method: 'get_public_key' }, peer.pubkey)
})

await client.subscribe(relays)

const invite = peers.invite()

console.log('invite:', invite)

const conn_str = ConnectToken.encode(invite)

console.log('connect str:\n', conn_str)


import { create_agent }       from '@test/lib/create.js'
import { encode_connect_url } from '@src/lib/encoder.js'

const name   = 'alice'
const relays = [ 'ws://localhost:8080' ]
const agent  = create_agent(name)

agent.on('*', (event, ...args) => {
  console.log(`[ agent ] client received '${event}' event:`, ...args)
})

agent.socket.on('*', (event, ...args) => {
  console.log(`[ agent ] socket received '${event}' event:`, ...args)
})

agent.invite.on('*', (event, ...args) => {
  console.log(`[ agent ] invite received '${event}' event:`, ...args)
})

agent.on('confirmed', (peer) => {
  console.log('[ peers ] peer confirmed:', peer)

  agent.request('get_public_key')
})

const invite = agent.create_invite(relays)

console.log('invite:', invite)

const conn_str = encode_connect_url(invite)

console.log('connect str:\n', conn_str)

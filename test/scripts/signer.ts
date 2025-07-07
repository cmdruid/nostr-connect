import { Assert }             from '@vbyte/micro-lib/assert'
import { decode_connect_url } from '@src/lib/encoder.js'
import { create_signer }      from '@test/lib/create.js'

const name   = 'carol'
const client = create_signer(name)

const invite_str = process.argv[2]

Assert.ok(typeof invite_str === 'string', 'no invite provided')

client.on('*', (event, ...args) => {
  console.log(`[ signer ] client received '${event}' event:`, ...args)
})

client.socket.on('*', (event, ...args) => {
  console.log(`[ signer ] socket received '${event}' event:`, ...args)
})

client.session.on('*', (event, ...args) => {
  console.log(`[ signer ] session received '${event}' event:`, ...args)
})

const invite = decode_connect_url(invite_str)

await client.join(invite)

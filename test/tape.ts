import tape from 'tape'

import { sleep }         from '@vbyte/micro-lib/util'
import { NostrRelay }    from './script/relay.js'
import { create_client } from './src/lib/client.js'

import type { TestContext } from './src/types.js'

import ping_test   from './src/case/ping.test.js'
import pubkey_test from './src/case/pubkey.test.js'
import sign_test   from './src/case/sign.test.js'

tape('nostr-connect test suite', async t => {

  const client = create_client('alice')
  const signer = create_client('carol')
  const relays = [ 'ws://localhost:8080' ]
  const server = new NostrRelay(8080)
  
  const ctx : TestContext = { client, signer, relays, tape: t }

  t.test('starting relay and nodes', async t => {
    await server.start()
    await client.connect(relays)
    await signer.connect(relays)
    t.pass('relay and nodes started')
  })

  await sleep(1000)
  ping_test(ctx)
  // pubkey_test(ctx)
  // sign_test(ctx)

  t.test('stopping relay and nodes', async t => {
    await sleep(1000) 
    await client.close()
    await signer.close()
    server.close()
    t.pass('relay and nodes stopped')
  })
})

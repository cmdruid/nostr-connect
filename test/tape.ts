import tape from 'tape'

import { sleep }      from '@/util/helpers.js'
import { NostrRelay } from './src/lib/relay.js'

import {
  create_client,
  create_server
} from './src/lib/client.js'

import type { TestContext } from './src/types.js'

import ping_test   from './src/case/ping.test.js'
import pubkey_test from './src/case/pubkey.test.js'
import sign_test   from './src/case/sign.test.js'

const RELAYS  = [ 'ws://localhost:8002' ]

tape('Nostr NIP-46 Test Suite', async t => {

  const client = await create_client('client', RELAYS)
  const server = await create_server('server', RELAYS)

  const relay = new NostrRelay(8002)
  
  const ctx : TestContext = { client, server, relays: RELAYS, tape: t }

  t.test('starting relay and nodes', async t => {
    await relay.start()
    await client.connect()
    await server.client.connect()
    t.pass('relay and nodes started')
  })

  await sleep(1000)
  ping_test(ctx)
  pubkey_test(ctx)
  sign_test(ctx)

  t.test('stopping relay and nodes', async t => {
    await sleep(1000) 
    await client.close()
    await server.client.close()
    relay.close()
    t.pass('relay and nodes stopped')
  })
})

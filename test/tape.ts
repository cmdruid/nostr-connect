import tape from 'tape'

import { sleep }         from '@/util/helpers.js'
import { NostrRelay }    from './src/lib/relay.js'
import { create_client } from './src/lib/client.js'

import type { TestContext } from './src/types.js'

import ping_test from './src/case/ping.test.js'

const RELAYS  = [ 'ws://localhost:8002' ]

tape('Nostr NIP-46 Test Suite', async t => {

  const clients = {
    local  : await create_client('local', RELAYS),
    remote : await create_client('remote', RELAYS)
  }

  const relay = new NostrRelay(8002)
  
  const ctx : TestContext = { clients, relays: RELAYS, tape: t }

  t.test('starting relay and nodes', async t => {
    await relay.start()
    await clients.local.connect()
    await clients.remote.connect()
    t.pass('relay and nodes started')
  })

  await sleep(1000)
  ping_test(ctx)

  t.test('stopping relay and nodes', async t => {
    await sleep(1000) 
    await clients.local.close()
    await clients.remote.close()
    relay.close()
    t.pass('relay and nodes stopped')
  })
})

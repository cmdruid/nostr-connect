import tape from 'tape'

import { sleep }          from '@/util/helpers.js'
import { NostrRelay }     from './src/lib/relay.js'
import { generate_nodes } from './src/lib/client.js'

import multicast_test from './src/case/connect.test.js'
import publish_test   from './src/case/register.test.js'

import type { TestContext } from './src/types.js'

const RELAYS  = [ 'ws://localhost:8002' ]

tape('Nostr NIP-46 Test Suite', async t => {

  const local_client  = new NostrClient(names, RELAYS)
  const local_signer  = new SimpleSigner()
  const remote_client = new NostrClient(names, RELAYS)
  const remote_signer        = new SimpleSigner()
  const remote_session       = new SessionManager(remote_client, local_client)

  const signer = new SimpleSigner()
  const relay = new NostrRelay(8002)
  
  const ctx : TestContext = { nodes, relays: RELAYS, tape: t }

  t.test('starting relay and nodes', async t => {
    await relay.start()
    await Promise.all(nodes.values().map(e => e.connect()))
    t.pass('relay and nodes started')
  })

  await sleep(1000)
  publish_test(ctx)
  await sleep(1000)
  multicast_test(ctx)

  t.test('stopping relay and nodes', async t => {
    await sleep(1000) 
    await Promise.all(nodes.values().map(node => node.close()))
    relay.close()
    t.pass('relay and nodes stopped')
  })
})

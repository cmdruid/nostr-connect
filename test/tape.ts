import tape           from 'tape'
import { sleep }      from '@vbyte/micro-lib/util'
import { NostrRelay } from './scripts/relay.js'

import {
  create_agent,
  create_signer
} from './lib/create.js'

import type { TestContext } from './types.js'

import ping_test    from './case/ping.test.js'
import request_test from './case/request.test.js'

tape('nostr-connect test suite', async t => {

  const agent  = create_agent('alice')
  const client = create_signer('carol')
  const relays = [ 'ws://localhost:8080' ]
  const server = new NostrRelay(8080)
  
  const ctx : TestContext = { agent, client, relays, tape: t }

  t.test('starting test relay', async t => {
    await server.start()
    t.pass('relay started')
  })

  await sleep(500)
  ping_test(ctx)
  request_test(ctx)

  t.test('stopping relay and nodes', async t => {
    await sleep(1000) 
    agent.close()
    client.close()
    server.close()
    t.pass('relay and nodes stopped')
    process.exit(0)
  })
})

import { parse_error } from '@/util/helpers.js'

import type { TestContext } from '../types.js'

/**
 * End-to-end test suite for NostrNode message passing.
 * Tests basic ping/pong functionality between two nodes.
 * 
 * @param ctx - Test context containing nodes and tape instance
 */
export default function (ctx : TestContext) {
  const { clients, tape } = ctx

  tape.test('ping test', async t => {
    try {
      const res = await clients.local.ping(clients.remote.pubkey)
      if (!res) {
        t.fail('ping failed')
      } else {
        t.pass('ping successful')
      }
    } catch (err) {
      t.fail(parse_error(err))
    } finally {
      t.end()
    }
  })
}
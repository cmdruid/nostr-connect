import { parse_error } from '@vbyte/micro-lib/util'

import type { TestContext } from '../types.js'

/**
 * End-to-end test suite for NostrNode message passing.
 * Tests basic ping/pong functionality between two nodes.
 * 
 * @param ctx - Test context containing nodes and tape instance
 */
export default function (ctx : TestContext) {
  const { client, signer,tape } = ctx

  tape.test('ping test', async t => {
    try {
      const res = await client.ping(signer.pubkey)
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
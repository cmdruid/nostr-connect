
import { REQ_METHOD }  from '@/const.js'
import { parse_error } from '@vbyte/micro-lib/util'

import type { TestContext } from '../types.js'

/**
 * End-to-end test suite for NostrNode message passing.
 * Tests basic ping/pong functionality between two nodes.
 * 
 * @param ctx - Test context containing nodes and tape instance
 */
export default function (ctx : TestContext) {
  const { client, signer, tape } = ctx

  signer.on('request', (signer, msg) => {
    if (msg.method === REQ_METHOD.SIGN_EVENT) {
      signer.sign_event(msg)
    }
  })

  tape.test('sign_event test', async t => {
    try {
      const params = { content: 'test' }
      const res    = await client.api.sign_event(params, server.pubkey)
      if (res.type !== 'accept') {
        t.fail('sign_event failed')
      } else {
        t.pass('sign_event successful')
      }
    } catch (err) {
      t.fail(parse_error(err))
    } finally {
      t.end()
    }
  })
}
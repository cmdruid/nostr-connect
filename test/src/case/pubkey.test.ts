import { REQ_METHOD }  from '@/const.js'
import { parse_error } from '@/util/helpers.js'

import type { TestContext } from '../types.js'

/**
 * End-to-end test suite for NostrNode message passing.
 * Tests basic ping/pong functionality between two nodes.
 * 
 * @param ctx - Test context containing nodes and tape instance
 */
export default function (ctx : TestContext) {
  const { client, server, tape } = ctx

  server.on('*', (event, ...args) => {
    console.log('*', event, ...args)
  })

  server.on('request', (server, msg) => {
    console.log('request', msg)
    if (msg.method === REQ_METHOD.GET_PUBKEY) {
      server.api.get_pubkey(msg)
    }
  })

  tape.test('get_pubkey test', async t => {
    try {
      const res = await client.api.get_pubkey(server.pubkey)
      if (res.type !== 'accept') {
        t.fail('get_pubkey failed')
      } else {
        t.pass('get_pubkey successful')
      }
    } catch (err) {
      t.fail(parse_error(err))
    } finally {
      t.end()
    }
  })
}
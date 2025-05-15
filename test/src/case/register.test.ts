import { parse_error } from '@/util/helpers.js'
import { get_node }    from '../lib/client.js'

import type { TestContext } from '../types.js'

const TIMEOUT = 5000  // 5 second timeout

/**
 * End-to-end test suite for NostrNode message passing.
 * Tests basic ping/pong functionality between two nodes.
 * 
 * @param ctx - Test context containing nodes and tape instance
 */
export default function (ctx : TestContext) {
  const { nodes, tape } = ctx

  const Alice = get_node(nodes, 'alice')
  const Bob   = get_node(nodes, 'bob')

  tape.test('publish test', async t => {
    try {
      const res : string | null = await new Promise((resolve, reject) => {
    
        // Set up promise to track pong response
        const timer = setTimeout(() => reject('timeout'), TIMEOUT)

        Alice.on('bounce', () => reject('alice bounced message'))
        Bob.on('bounce',   () => reject('bob bounced message'))

        Bob.inbox.tag.on('ping', (msg) => {
          const res = { id: msg.id, tag: 'pong', data: 'pong!' }
          Bob.publish(res, msg.env.pubkey)
        })

        Alice.inbox.tag.on('pong', () => {
          clearTimeout(timer)
          resolve(null)
        })

        Alice.publish({ tag: 'ping', data: 'ping!' }, Bob.pubkey)
      })

      if (res !== null) {
        t.fail(res)
      } else {
        t.pass('received pong message')
      }
    } catch (err) {
      t.fail(parse_error(err))
    } finally {
      t.end()
    }
  })
}

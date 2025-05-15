import { parse_error }         from '@/util/helpers.js'
import { get_node, get_peers } from '../lib/client.js'

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
  const peers = get_peers(nodes, 'alice')

  tape.test('multicast test', async t => {
    try {
      const res : string | null = await new Promise((resolve, reject) => {
    
        // Set up promise to track pong response
        const timer = setTimeout(() => reject('timeout'), TIMEOUT)

        nodes.forEach(node => {
          node.on('bounce', () => reject('node bounced message'))

          node.inbox.tag.on('ping', (msg) => {
            const res = { id: msg.id, tag: 'pong', data: 'pong!' }
            node.publish(res, msg.env.pubkey)
          })
        })

        Alice.multicast({ tag: 'ping', data: 'ping!' }, peers).then(res => {
          clearTimeout(timer)
          if (res.sub.ok) {
            resolve(null)
          } else {
            resolve('multicast failed')
          }
        })
      })

      if (res !== null) {
        t.fail(res)
      } else {
        t.pass('received all pong events')
      }
    } catch (err) {
      t.fail(parse_error(err))
    } finally {
      t.end()
    }
  })
}

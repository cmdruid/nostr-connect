import { parse_error } from '@vbyte/micro-lib/util'

import type { TestContext } from '../types.js'

/**
 * End-to-end test suite for NostrNode message passing.
 * Tests basic ping/pong functionality between two nodes.
 * 
 * @param ctx - Test context containing nodes and tape instance
 */
export default function (ctx : TestContext) {
  const { agent, client, tape } = ctx

  tape.test('connect test', async t => {
    try {

      // service.client.on('*', (event, ...args) => {
      //   console.log('*', event, ...args)
      // })

      // service.peer.on('*', (event, ...args) => {
      //   console.log('*', event, ...args)
      // })

      // signer.client.on('*', (event, ...args) => {
      //   console.log('*', event, ...args)
      // })

      // signer.session.on('*', (event, ...args) => {
      //   console.log('*', event, ...args)
      // })

      const invite = agent.invite()

      t.pass('created invite')

      agent.on('join', () => {
        t.pass('received join event')
      })

      client.session.on('pending', () => {
        t.pass('received pending event')
      })

      client.session.on('activated', () => {
        t.pass('received activated event')
      })

      client.session.connect(invite)

      t.pass('initiated session connection')

      setTimeout(() => {
        t.fail('session connection failed')
      }, 5000)

    } catch (err) {
      t.fail(parse_error(err))
    } finally {
      t.end()
    }
  })
}
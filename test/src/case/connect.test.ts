import { parse_error } from '@vbyte/micro-lib/util'

import type { TestContext } from '../types.js'

/**
 * End-to-end test suite for NostrNode message passing.
 * Tests basic ping/pong functionality between two nodes.
 * 
 * @param ctx - Test context containing nodes and tape instance
 */
export default function (ctx : TestContext) {
  const { provider, member, tape } = ctx

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

      const invite = provider.channel.invite()

      t.pass('created invite')

      member.session.on('pending', () => {
        t.pass('received pending event')
      })

      member.session.on('activated', () => {
        t.pass('received activated event')
      })

      member.session.connect(invite)

      t.pass('initiated session connection')

      const res = await provider.client.request({
        method : 'get_public_key'
      }, member.client.pubkey)

      if (res) t.pass('get_pubkey successful')
      else     t.fail('get_pubkey failed')

    } catch (err) {
      t.fail(parse_error(err))
    } finally {
      t.end()
    }
  })
}
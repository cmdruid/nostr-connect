import { now, parse_error } from '@vbyte/micro-lib/util'
import { Assert, JsonUtil } from '@vbyte/micro-lib'

import {
  validate_event_template,
  validate_signed_event
} from '@/lib/event.js'

import type { TestContext } from '../types.js'

/**
 * End-to-end test suite for NostrNode message passing.
 * Tests basic ping/pong functionality between two nodes.
 * 
 * @param ctx - Test context containing nodes and tape instance
 */
export default function (ctx : TestContext) {
  const { agent, client, relays, tape } = ctx

  tape.test('request test', async t => {
    try {

      // provider.client.on('*', (event, ...args) => {
      //   console.log('[ provider ]', event, ...args)
      // })

      // provider.channel.on('*', (event, ...args) => {
      //   console.log('[ channel ]', event, ...args)
      // })

      // member.client.on('*', (event, ...args) => {
      //   console.log('[ member ]', event, ...args)
      // })

      // member.request.on('*', (event, ...args) => {
      //   console.log('[ request ]', event, ...args)
      // })

      // member.session.on('*', (event, ...args) => {
      //   console.log('[ session ]', event, ...args)
      // })

      const template = JSON.stringify({
        content    : 'test',
        created_at : now(),
        kind       : 1,
        tags       : [],
      })

      client.request.on('prompt', async (req) => {
        t.pass('received prompt request')
        client.request.approve(req)
      })

      client.request.on('approve', async (req) => {
        Assert.ok(req.method === 'sign_event', 'incorrect method: ' + req.method)
        t.pass('received sign_event request')
        const json_str = req.params?.at(0)
        Assert.exists(json_str, 'no event template provided')
        const template = JsonUtil.parse(json_str)
        Assert.exists(template, 'failed to parse event template: ' + json_str)
        t.pass('parsed event template')
        validate_event_template(template)
        t.pass('event template is valid')
        const signed = await client.signer.sign_event(template)
        t.pass('event is signed')
        const json = JSON.stringify(signed)
        client.request.resolve(req, json)
        t.pass('responded to request')
      })

      const invite = agent.invite.create({ relays })
      const prom1  = agent.invite.listen(invite)
      const prom2  = client.session.join(invite)

      await Promise.all([ prom1, prom2 ])

      t.pass('signer client connected to agent')

      const res = await agent.request('sign_event', [ template ])

      Assert.ok(res.type === 'accept',          'response was rejected')
      t.pass('received response')
      Assert.ok(typeof res.result === 'string', 'invalid response payload')
      const event = JsonUtil.parse(res.result)
      Assert.exists(event, 'failed to parse event: ' + res.result)
      t.pass('parsed signed event')
      validate_signed_event(event)
      t.pass('verified signed event')

    } catch (err) {
      console.log(err)
      t.fail(parse_error(err))
    } finally {
      t.end()
    }
  })
}
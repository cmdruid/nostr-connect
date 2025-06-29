import { now, parse_error } from '@vbyte/micro-lib/util'
import { Assert, JsonUtil } from '@vbyte/micro-lib'
import { open_channel }     from '../lib/connect.js'

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
  const { provider, member, tape } = ctx

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

      await open_channel(provider, member)

      t.pass('created channel')

      member.request.on('request', async (req) => {
        member.request.approve(req)
      })

      member.request.on('approved', async (req) => {
        Assert.ok(req.method === 'sign_event', 'incorrect method: ' + req.method)
        t.pass('received sign_event request')
        const json_str = req.params.at(0)
        const template = JsonUtil.parse(json_str)
        Assert.exists(template, 'failed to parse event template: ' + json_str)
        t.pass('parsed event template')
        validate_event_template(template)
        t.pass('event template is valid')
        const signed = await member.signer.sign_event(template)
        t.pass('event is signed')
        const json = JSON.stringify(signed)
        member.client.respond(req.id, req.session.pubkey, json)
      })

      provider.client.on('response', (msg) => {
        Assert.ok(msg.type === 'accept',          'response was rejected')
        t.pass('received response')
        Assert.ok(typeof msg.result === 'string', 'invalid response payload')
        const event = JsonUtil.parse(msg.result)
        Assert.exists(event, 'failed to parse event: ' + msg.result)
        t.pass('parsed signed event')
        validate_signed_event(event)
        t.pass('verified signed event')
      })

      const template = JSON.stringify({
        content    : 'test',
        created_at : now(),
        kind       : 1,
        tags       : [],
      })

      const res = await provider.client.request({
        method : 'sign_event',
        params : [ template ]
      }, member.client.pubkey)

      if (res) t.pass('sign_event successful')
      else     t.fail('sign_event failed')

    } catch (err) {
      t.fail(parse_error(err))
    } finally {
      t.end()
    }
  })
}
import type { ChannelMember, SessionToken } from '@/index.js'
import type { TestProvider, TestMember }    from '@test/types.js'

export function open_channel (
  provider : TestProvider,
  signer   : TestMember
) : Promise<SessionToken> {
  const invite = provider.channel.invite()

  provider.channel.on('join', (mbr : ChannelMember) => {
    provider.client.request({ method: 'get_public_key' }, mbr.pubkey)
  })
  
  return signer.session.connect(invite)
}

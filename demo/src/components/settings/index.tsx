import { RelayConfig }       from './relays.js'
import { ResetStore }        from './reset.js'
import { NsecConfig }        from './nsec.js'

export function Settings () {
  return (
    <>
      <NsecConfig />
      <RelayConfig       />
      <ResetStore        />
    </>
  )
}

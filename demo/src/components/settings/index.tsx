import { RelayConfig }       from './relays.js'
import { ResetStore }        from './reset.js'
import { SecretConfig }        from './secret.js'

export function Settings () {
  return (
    <>
      <SecretConfig />
      <RelayConfig       />
      <ResetStore        />
    </>
  )
}

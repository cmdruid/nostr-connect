import * as Encoder from './lib/encoder.js'

export * from './class/client.js'
export * from './class/session.js'
export * from './class/signer.js'

export * as CONST  from './const.js'
export * as Lib    from './lib/index.js'
export * as Schema from './schema/index.js'
export * as Util   from './util/index.js'

export * from './types/index.js'

export namespace TokenEncoder {
  export const connect = {
    encode: Encoder.encode_connect_url,
    decode: Encoder.decode_connect_url
  }

  export const invite = {
    encode: Encoder.encode_invite_url,
    decode: Encoder.decode_invite_url
  }
}

import { Assert } from '@vbyte/micro-lib/assert'

import {
  decode_permissions,
  encode_permissions
} from '@/lib/perms.js'

import type { InviteToken, AgentProfile } from '@/types/index.js'

export namespace InviteEncoder {
  export const encode = encode_connect_url
  export const decode = decode_connect_url
}

export function encode_connect_url (token : InviteToken) {
  // Unpack the session token.
  const { policy, pubkey, relays, secret } = token
  // Create the base connection string.
  let url = `nostrconnect://${pubkey}?`
  // Check if the relays are provided.
  if (!relays || relays.length === 0) {
    throw new Error('no relays provided')
  }
  // Add the relays to the connection string.
  relays.forEach((relay) => {
    url += `relay=${encodeURIComponent(relay)}&`
  })
  // Add the name to the connection string.
  if (token.profile.name) {
    url += `name=${encodeURIComponent(token.profile.name)}&`
  }
  // Add the client host url to the connection string.
  if (token.profile.url) {
    url += `url=${encodeURIComponent(token.profile.url)}&`
  }
  // Add the image to the connection string.
  if (token.profile.image) {
    url += `image=${encodeURIComponent(token.profile.image)}&`
  }
  // Add the permissions to the connection string.
  if (policy) {
    const encoded = encode_permissions(policy)
    url += `perms=${encodeURIComponent(encoded)}&`
  }
  // Check if the secret is provided.
  if (!secret) throw new Error('no secret provided')
  // Add the secret to the connection string.
  url += `secret=${encodeURIComponent(secret)}`
  // Return the connection string.
  return url
}

export function decode_connect_url (str : string) : InviteToken {
  // Convert the string to a URL object.
  const token = new URL(str)
  // Get the pubkey from the hostname.
  const pubkey = token.hostname
  // Get the query params.
  const params = token.searchParams
  // Get the relays.
  const relays = params.getAll('relay')
  // Assert that the relays are provided.
  Assert.ok(relays.length > 0, 'no relays provided')
  // Get the secret.
  const secret = params.get('secret')
  // Assert that the secret is provided.
  Assert.exists(secret, 'no secret provided')
  // Get the profile.
  const profile : AgentProfile = {}
  // Get the name.
  profile.name = params.get('name')   || undefined
  // Get the client host url.
  profile.url  = params.get('url')    || undefined
  // Get the image.
  profile.image = params.get('image') || undefined
  // Get the permissions.
  const pstr   = params.get('perms')  || undefined
  // Decode the permissions.
  const policy = pstr ? decode_permissions(pstr) : { methods : {}, kinds : {} }
  // Return the session token.
  return { policy, profile, pubkey, relays, secret }
}

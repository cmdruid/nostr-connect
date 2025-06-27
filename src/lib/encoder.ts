import { Assert } from '@vbyte/micro-lib/assert'

import {
  DEFAULT_POLICY,
  decode_permissions,
  encode_permissions
} from '@/lib/perms.js'

import type { ConnectionToken } from '@/types/index.js'

export namespace ConnectToken {
  export const encode = encode_connect_url
  export const decode = decode_connect_url
}

export function encode_connect_url (token : ConnectionToken) {
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
  if (token.name) {
    url += `name=${encodeURIComponent(token.name)}&`
  }
  // Add the client host url to the connection string.
  if (token.url) {
    url += `url=${encodeURIComponent(token.url)}&`
  }
  // Add the image to the connection string.
  if (token.image) {
    url += `image=${encodeURIComponent(token.image)}&`
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

export function decode_connect_url (str : string) : ConnectionToken {
  // Convert the string to a URL object.
  const token = new URL(str)
  // Get the pubkey from the hostname.
  const pubkey = token.hostname
  // Get the query params.
  const params = token.searchParams
  // Get the name.
  const name  = params.get('name')
  // Assert that the name is provided.
  Assert.exists(name, 'session name is required')
  // Get the relays.
  const relays = params.getAll('relay')
  // Assert that the relays are provided.
  Assert.ok(relays.length > 0, 'no relays provided')
  // Get the secret.
  const secret = params.get('secret')
  // Assert that the secret is provided.
  Assert.exists(secret, 'no secret provided')
  // Get the client host url.
  const url    = params.get('url')   || undefined
  // Get the image.
  const image  = params.get('image') || undefined
  // Get the permissions.
  const pstr   = params.get('perms') || undefined
  // Decode the permissions.
  const policy = pstr ? decode_permissions(pstr) : DEFAULT_POLICY()
  // Return the session token.
  return { pubkey, relays, secret, name, url, image, policy }
}

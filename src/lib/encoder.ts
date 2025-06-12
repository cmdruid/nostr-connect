import type {
  PermissionMap,
  ConnectionToken
} from '@/types/index.js'

export namespace ConnectToken {
  export const encode = encode_connect_url
  export const decode = decode_connect_url
}

export function encode_connect_url (token : ConnectionToken) {
  // Unpack the session token.
  const { perms, pubkey, relays, secret } = token
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
  if (perms) {
    const encoded = encode_permissions(perms)
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
  // Get the relays.
  const relays = params.getAll('relay')
  // Check if the relays are provided.
  if (relays.length === 0) throw new Error('no relays provided')
  // Get the secret.
  const secret = params.get('secret')
  // Check if the secret is provided.
  if (!secret) throw new Error('no secret provided')
  // Get the name.
  const name  = params.get('name')  || undefined
  // Get the client host url.
  const url   = params.get('url')   || undefined
  // Get the image.
  const image = params.get('image') || undefined
  // Get the permissions.
  const pstr  = params.get('perms') || undefined
  // Decode the permissions.
  const perms = pstr ? decode_permissions(pstr) : undefined
  // Return the session token.
  return { pubkey, relays, secret, name, url, image, perms }
}

export function encode_permissions (perm_map : PermissionMap) {
  // Get the entries from the permission map.
  const entries  = Object.entries(perm_map)
  // Create the permission string.
  let perm_str = ''
  // Iterate over the entries.
  entries.forEach(([ key, values ]) => {
    // Check if the values are empty.
    if (!Array.isArray(values) || values.length === 0) {
      // Add the key to the permission string.
      perm_str += `${key},`
    } else {
      // Iterate over the values.
      values.forEach((value) => {
        // Add the key and value to the permission string.
        perm_str += `${key}:${value},`
      })
    }
  })
  // Remove the trailing comma and return the permission string.
  return perm_str.slice(0, -1)
}

export function decode_permissions (str : string) {
  // Create the permission map.
  const perms   : PermissionMap = {}
  // Split the permission string into entries.
  const entries = str.split(',')
  // Iterate over the entries.
  entries.forEach((entry) => {
    // Split the entry into key and value.
    const [ key, value ] = entry.split(':')
    // Get the current value for the key.
    const curr = perms[key] || []
    // Check if the value is a string.
    if (Array.isArray(curr) && typeof value === 'string') {
      // Parse the value as an integer and add it to the current value.
      perms[key] = [ ...curr, parseInt(value) ]
    } else {
      // Add the value to the current value.
      perms[key] = true
    }
  })
  // Return the permission map.
  return perms
}

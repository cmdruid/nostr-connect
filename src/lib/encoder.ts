import type {
  SessionToken,
  PermissionMap
} from '@/types/index.js'

export function encode_bunker_url (token : SessionToken) {
  const { pubkey, relays, secret } = token

  let url = `bunker://${pubkey}?`
  
  if (!relays || relays.length === 0) {
    throw new Error('no relays provided')
  }

  relays.forEach((relay) => {
    url += `relay=${encodeURIComponent(relay)}&`
  })
  

  if (!secret) throw new Error('no secret provided')
  
  url += `secret=${encodeURIComponent(secret)}`

  return url
}

export function decode_bunker_url (str : string) : SessionToken {
  // Remove protocol
  let content = str.replace('bunker://', '')
  
  // Split pubkey from query params
  const [ pubkey, query ] = content.split('?')
  
  if (!query) throw new Error('no query provided')
  
  // Parse query parameters
  const params = new URLSearchParams(query)
  const relays = params.getAll('relay')
  if (relays.length === 0) throw new Error('no relays provided')
  const secret = params.get('secret')
  if (!secret) throw new Error('no secret provided')
  
  return { pubkey, relays, secret }
}

export function encode_connect_url (token : SessionToken) {
  const { perms, pubkey, relays, secret } = token

  let url = `nostrconnect://${pubkey}?`

  // Add relay parameters if present
  if (!relays || relays.length === 0) {
    throw new Error('no relays provided')
  }

  relays.forEach((relay) => {
    url += `relay=${encodeURIComponent(relay)}&`
  })

  if (token.name) {
    url += `name=${encodeURIComponent(token.name)}&`
  }

  if (token.url) {
    url += `url=${encodeURIComponent(token.url)}&`
  }

  if (token.image) {
    url += `image=${encodeURIComponent(token.image)}&`
  }

  if (perms) {
    const encoded = encode_permissions(perms)
    url += `perms=${encodeURIComponent(encoded)}&`
  }
  
  // Add secret if present
  if (!secret) throw new Error()
  
  url += `secret=${encodeURIComponent(secret)}`
  
  return url
}

export function decode_connect_url (str : string) : SessionToken {
  // Remove protocol
  let content = str.replace('nostrconnect://', '')
  
  // Split pubkey from query params
  const [ pubkey, query ] = content.split('?')
  
  if (!query) throw new Error('no query provided')
  
  // Parse query parameters
  const params = new URLSearchParams(query)
  const relays = params.getAll('relay')
  if (relays.length === 0) throw new Error('no relays provided')
  const secret = params.get('secret')
  if (!secret) throw new Error('no secret provided')
  const name  = params.get('name')  || undefined
  const url   = params.get('url')   || undefined
  const image = params.get('image') || undefined
  const pstr  = params.get('perms') || undefined

  const perms = (pstr)
    ? decode_permissions(pstr)
    : undefined

  return { pubkey, relays, secret, name, url, image, perms }
}

export function encode_permissions (perm_map : PermissionMap) {
  const entries  = Array.from(perm_map.entries())
  let   perm_str = ''

  entries.forEach(([ key, values ]) => {
    if (values.length === 0) {
      perm_str += `${key},`
    } else {
      values.forEach((value) => {
        perm_str += `${key}:${value},`
      })
    }
  })

  return perm_str.slice(0, -1)
}

export function decode_permissions (str : string) {
  const perms   = new Map<string, number[]>()
  const entries = str.split(',')

  entries.forEach((entry) => {
    const [ key, value ] = entry.split(':')
    const curr = perms.get(key) || []
    if (typeof value === 'string') {
      perms.set(key, [ ...curr, parseInt(value) ])
    } else {
      perms.set(key, [ ...curr, value ])
    }
  })
  return perms
}

import { Assert }               from '@vbyte/micro-lib/assert'
import { now }                  from '@vbyte/micro-lib/util'
import { parse_event_template } from '@/lib/event.js'
import { FLAGS }                from '@/const.js'
import * as Schema              from '@/schema/index.js'

import type {
  PermissionPolicy,
  PermissionRequest,
  PermissionUpdate,
  RequestMessage,
  SessionToken
} from '@/types/index.js'

export const DEFAULT_POLICY : () => PermissionPolicy = () => {
  return {
    methods : {},
    kinds   : {}
  }
}

export function validate_policy (policy : unknown) : asserts policy is PermissionPolicy {
  const parsed = Schema.client.perm_map.safeParse(policy)
  if (!parsed.success && FLAGS.debug) {
    console.error(parsed.error)
    throw new TypeError('invalid permissionpolicy')
  }
}

export function update_policy (
  policy  : PermissionPolicy,
  updates : PermissionUpdate
) : PermissionPolicy {
  const updated = Object.assign({}, policy)
  Object.assign(updated.methods, updates.methods)
  Object.assign(updated.kinds,   updates.kinds)
  return updated
}

export function create_permission_request (
  message : RequestMessage,
  token   : SessionToken
) : PermissionRequest {
  return {
    id         : message.id,
    method     : message.method,
    params     : message.params,
    session    : token,
    stamp      : now()
  }
}

export function check_permission_request (
  req : PermissionRequest
) : boolean | null {
  // Get the request details.
  const { method, params, session } = req
  // Get the policy from the session.
  const policy = session.policy
  // Assert that the policy is valid.
  validate_policy(policy)
  // If the method is sign_event, check the kind.
  if (method === 'sign_event') {
    // Parse the event template.
    const tmpl = parse_event_template(params[0])
    // If the kind is allowed, return true.
    if (policy.kinds[tmpl.kind] === true)  return true
    // If the kind is denied, return false.
    if (policy.kinds[tmpl.kind] === false) return false
  } else {
    // If the method is not sign_event, check the method.
    if (policy.methods[method] === true)  return true
    // If the method is denied, return false.
    if (policy.methods[method] === false) return false
  }
  // If the method is not allowed and not denied, return null.
  return null
}

export function encode_permissions (policy : PermissionPolicy) {
  // Create the permission string.
  let perm_str = ''
  // Iterate over the policy methods:
  Object.entries(policy.methods).forEach(([ key, value ]) => {
    // If the key is not sign_event, add it to the permission string.
    if (value && key !== 'sign_event') perm_str += `${key},`
  })
  // Iterate over the policy kinds:
  Object.entries(policy.kinds).forEach(([ key, value ]) => {
    // If the key is not sign_event, add it to the permission string.
    if (value) perm_str += `sign_event:${key},`
  })
  // Remove the trailing comma and return the permission string.
  return perm_str.slice(0, -1)
}

export function decode_permissions (str : string) : PermissionPolicy {
  const methods : Record<string, boolean> = {}
  const kinds   : Record<number, boolean> = {}
  // Split the permission string into entries.
  const entries = str.split(',')
  // Iterate over the entries.
  entries.forEach((entry) => {
    // Check if the entry is empty.
    if (entry.length === 0) return
    // Check if the entry has more options.
    if (entry.includes(':')) {
      // Split the entry into key and value.
      const [ key, value ] = entry.split(':')
      // Assert that the key is sign_event.
      Assert.ok(key === 'sign_event', 'invalid permission entry: ' + entry)
      // Ensure that the value is an integer.
      Assert.is_uint(value)
      // Mark the sign_event permission as true.
      methods[key] = true
      // Mark the kind as true.
      kinds[parseInt(value)] = true
    } else {
      // Add the value to the current value.
      methods[entry] = true
    }
  })
  // Return the permission policy.
  return { methods, kinds }
}

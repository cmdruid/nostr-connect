import { Assert }  from '@vbyte/micro-lib/assert'
import { FLAGS }   from '@/const.js'
import * as Schema from '@/schema/index.js'

import { PermissionPolicy } from '@/types/index.js'

export const DEFAULT_POLICY : () => PermissionPolicy = () => {
  return {
    methods : {},
    kinds   : {}
  }
}

export function validate_perm_policy (perms : unknown) : asserts perms is PermissionPolicy {
  const parsed = Schema.client.perm_map.safeParse(perms)
  if (!parsed.success && FLAGS.debug) {
    console.error(parsed.error)
    throw new TypeError('invalid permissions')
  }
}

export function update_policy_methods (
  policy  : PermissionPolicy,
  updates : Record<string, boolean>
) : PermissionPolicy {
  return {
    methods : policy.methods,
    kinds   : policy.kinds
  }
}

export function update_policy_kinds (
  policy  : PermissionPolicy,
  updates : Record<number, boolean>
) : PermissionPolicy {
  return {
    methods : policy.methods,
    kinds   : policy.kinds
  }
}

export function get_perms_config (
  perms  : unknown,
  policy : PermissionPolicy
) : PermissionMap {
  // Assert that the permissions are an object.
  validate_permissions(perms)
  // Initialize the default policy for allowed methods.
  for (const method of policy.methods.allow) {
    if (!perms[method]) perms[method] = true
  }
  // Initialize the default policy for denied methods.
  for (const method of policy.methods.deny) {
    if (perms[method]) perms[method] = false
  }
  // If there are policies set for event kinds,
  if (policy.kinds.allow.length > 0 || policy.kinds.deny.length > 0) {
    // Initialize the default policy for allowed kinds.
    perms.sign_event ??= []
    Assert.ok(Array.isArray(perms.sign_event), 'sign_event permission must be an array')
    // Initialize the default policy for allowed kinds.
    for (const kind of policy.kinds.allow) {
      if (!perms.sign_event.includes(kind)) perms.sign_event.push(kind)
    }
    // Initialize the default policy for denied kinds.
    for (const kind of policy.kinds.deny) {
      if (perms.sign_event.includes(kind)) perms.sign_event.splice(perms.sign_event.indexOf(kind), 1)
    }
  }
  // Return the permissions.
  return perms
}

export function encode_permissions (policy : PermissionPolicy) {
  // Get the entries from the permission map.
  const entries  = Object.entries(policy)
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

export function decode_permissions (str : string) : PermissionPolicy {
  // Create the permission map.
  const perms   : PermissionMap = {}
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
      // Get the current value for the key.
      const curr = perms[key] ?? []
      // Assert that the current value is an array.
      Assert.ok(Array.isArray(curr), 'expected an array for key: ' + key)
      // Parse the value as an integer and add it to the current value.
      perms[key] = [ ...curr, parseInt(value) ]
    } else {
      // Add the value to the current value.
      perms[entry] = true
    }
  })
  // Return the permission map.
  return perms
}

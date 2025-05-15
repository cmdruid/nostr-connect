import { Schema } from '@/util/index.js'

/**
 * Validates an array of relay URLs.
 * @param relays   Value to validate as relay URL array
 * @throws {Error} If the relay array is invalid
 */
export function verify_relays (relays : unknown) : asserts relays is string[] {
  const schema = Schema.str.url().array()
  const parsed = schema.safeParse(relays)
  if (!parsed.success) {
    throw new Error('invalid relay set: ' + relays)
  }
}

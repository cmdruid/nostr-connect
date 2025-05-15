export namespace JsonUtil {
  export const parse     = parse_json
  export const normalize = normalize_obj
  export const sanitize  = sanitize_json
  export const serialize = serialize_json
  export const copy      = deep_copy
}

type JsonReplacer = (key : string, value : unknown) => unknown
type JsonReviver  = (key : string, value : unknown) => unknown

const REPLACER : JsonReplacer = (_: string, value: any) => {
  if (value === null || value === undefined) return value
  if (value instanceof Map) {
    return { __type: 'map', data: Array.from(value.entries()) }
  }
  else if (value instanceof Set) {
    return { __type: 'set', data: Array.from(value.entries()) }
  }
  else if (value instanceof Date) {
    return { __type: 'date', data: value.toISOString() }
  }
  return value
}

const REVIVER : JsonReviver = (_: string, value: any) => {
  if (value === null || value === undefined) return value
  if (typeof value === 'object' && value.__type === 'map') {
    return new Map(value.data)
  }
  else if (typeof value === 'object' && value.__type === 'set') {
    return new Set(value.data)
  }
  else if (typeof value === 'object' && value.__type === 'date') {
    return new Date(value.data)
  }
  return value
}

function sanitize_json (
  json_str : string, 
  reviver  : JsonReviver = REVIVER
) {
  const obj = parse_json(json_str, reviver)
  if (obj === null) return null
  const normalized = normalize_obj(obj)
  return JSON.stringify(normalized)
}

function serialize_json <T = Record<string, unknown>> (
  json_obj : T,
  replacer : JsonReplacer = REPLACER
) : string | null {
  try {
    const normalized = normalize_obj(json_obj)
    return JSON.stringify(normalized, replacer)
  } catch {
    return null
  }
}

function normalize_obj <
  T extends Record<keyof T, any>
> (obj : T) : T {
  if (obj instanceof Map || Array.isArray(obj) || typeof obj !== 'object') {
    return obj
  } else {
    return Object.keys(obj)
      .sort()
      .filter(([ _, value ]) => value !== undefined)
      .reduce<Record<string, any>>((sorted, key) => {
        sorted[key] = obj[key as keyof T]
        return sorted
      }, {}) as T
  }
}

function parse_json <T = Record<string, unknown>> (
  json_str : string,
  reviver  : JsonReviver = REVIVER
) : T | null {
  try {
    const sanitized = json_str.replace(/\s/g, '')
    let   parsed    = JSON.parse(sanitized, reviver)
    if (typeof parsed === 'string') {
      parsed = JSON.parse(parsed, reviver)
    }
    if (!(typeof parsed === 'object' && parsed !== null)) {
      return null
    }
    return normalize_obj(parsed)
  } catch (error) {
    return null
  }
}

function deep_copy <T = Record<string, unknown>> (
  json_obj : T,
  replacer : JsonReplacer = REPLACER,
  reviver  : JsonReviver  = REVIVER
) : T {
  // Use JSON serialization with custom replacer and reviver
  const json_str = JSON.stringify(json_obj, replacer)
  const copy_obj = JSON.parse(json_str, reviver)
  return copy_obj
}

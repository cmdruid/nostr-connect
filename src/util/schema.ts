import { z } from 'zod'

type Literal = z.infer<typeof literal>
type Json    = Literal | { [key : string] : Json } | Json[]

const big     = z.bigint(),
      bool    = z.boolean(),
      date    = z.date(),
      num     = z.number().min(Number.MIN_SAFE_INTEGER).max(Number.MAX_SAFE_INTEGER),
      int     = num.int(),
      u8a     = z.instanceof(Uint8Array),
      str     = z.string(),
      stamp   = int.min(500_000_000),
      any     = z.any(),
      zod     = z

const char  = int.min(0).max(0xFF),
      short = int.min(0).max(0xFFFF),
      uint  = int.min(0).max(0xFFFFFFFF)

const float  = z.number().refine((e) => String(e).includes('.')),
      float2 = float.refine((e) => {
        const parts = String(e).split('.').at(1)
        return parts !== undefined && parts.length <= 2
      })

const hex = z.string()
  .regex(/^[0-9a-fA-F]*$/)
  .refine(e => e.length % 2 === 0)

const literal = z.union([
  z.string(), z.number(), z.boolean(), z.null()
])

const json : z.ZodType<Json> = z.lazy(() =>
  z.union([ literal, z.array(json), z.record(json) ])
)

const u8a20    = u8a.refine((e) => e.length === 20)
const u8a32    = u8a.refine((e) => e.length === 32)
const u8a33    = u8a.refine((e) => e.length === 33)
const u8a64    = u8a.refine((e) => e.length === 64)

const hex20    = hex.refine((e) => e.length === 40)
const hex32    = hex.refine((e) => e.length === 64)
const hex33    = hex.refine((e) => e.length === 66)
const hex64    = hex.refine((e) => e.length === 128)

const bytes  = z.union([ hex, u8a ])
const byte32 = z.union([ hex32, u8a32 ])
const byte33 = z.union([ hex33, u8a33 ])
const byte64 = z.union([ hex64, u8a64 ])

const base58    = z.string().regex(/^[1-9A-HJ-NP-Za-km-z]+$/)
const base64    = z.string().regex(/^[a-zA-Z0-9+/]+={0,2}$/)
const base64url = z.string().regex(/^[a-zA-Z0-9\-_]+={0,2}$/)
const bech32    = z.string().regex(/^[a-z]+1[023456789acdefghjklmnpqrstuvwxyz]+$/)

export {
  any,
  base58,
  base64,
  base64url,
  bech32,
  big,
  bool,
  bytes,
  byte32,
  byte33,
  byte64,
  char,
  date,
  float,
  float2,
  hex20,
  hex32,
  hex33,
  hex64,
  hex,
  json,
  literal,
  num,
  short,
  str,
  stamp,
  uint,
  u8a,
  u8a20,
  u8a32,
  u8a33,
  u8a64,
  zod
}

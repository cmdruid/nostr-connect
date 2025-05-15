export const now   = () => Math.floor(Date.now() / 1000)
export const sleep = (ms : number = 1000) => new Promise(res => setTimeout(res, ms))

export function parse_error (err : unknown) : string {
  if (err instanceof Error)    return err.message
  if (typeof err === 'string') return err
  return String(err)
}

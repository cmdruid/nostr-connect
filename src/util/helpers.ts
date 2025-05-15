export const now   = () => Math.floor(Date.now() / 1000)
export const sleep = (ms : number = 1000) => new Promise(res => setTimeout(res, ms))

export function parse_error (err : unknown) : string {
  if (err instanceof Error)    return err.message
  if (typeof err === 'string') return err
  return String(err)
}

export function create_timeout <T> (
  promise  : Promise<T>,
  timeout  : number
) : Promise<T> {
  return new Promise(async (resolve, reject) => {
    const timer = setTimeout(() => reject('timeout'), timeout)
    const res   = await promise
    clearTimeout(timer)
    resolve(res)
  })
}

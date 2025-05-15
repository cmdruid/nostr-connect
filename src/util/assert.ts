export namespace Assert {
  export function ok (value : unknown, message ?: string) : asserts value {
    if (value === false) throw new Error(message ?? 'Assertion failed!')
  }

  export function exists <T> (
    input   ?: T | null,
    err_msg ?: string
  ) : asserts input is NonNullable<T> {
    if (typeof input === 'undefined') {
      throw new TypeError(err_msg ?? 'Input is undefined!')
    }
    if (input === null) {
      throw new TypeError(err_msg ?? 'Input is null!')
    }
  }
}

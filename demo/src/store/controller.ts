type Subscriber = () => void

export class DBController<T> {
  private readonly _defaults  : T
  private readonly _store_key : string
  private readonly _subs      : Set<Subscriber> = new Set()

  constructor (
    store_key : string,
    defaults  : T
  ) {
    this._defaults  = defaults
    this._store_key = store_key
  }

  get_defaults () : T {
    return this._defaults
  }

  get () : T {
    try {
      const item = localStorage.getItem(this._store_key)
      return item ? JSON.parse(item) : this._defaults
    } catch {
      return this._defaults
    }
  }

  reset () : void {
    this.set(this._defaults)
  }

  set (value : T ) : void {
    try {
      localStorage.setItem(this._store_key, JSON.stringify(value))
      this._notify_subs()
    } catch (error) {
      console.error('Error saving to localStorage:', error)
    }
  }

  subscribe (callback : Subscriber) : () => void {
    this._subs.add(callback)
    return () => this._subs.delete(callback)
  }

  update (value : Partial<T>) : void {
    this.set({ ...this.get(), ...value })
  }

  private _notify_subs(): void {
    this._subs.forEach(subscriber => subscriber())
  }
}

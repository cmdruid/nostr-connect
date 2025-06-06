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
      const current = this.get()
      const merged  = this._merge(current, value)
      localStorage.setItem(this._store_key, JSON.stringify(merged))
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
    const current = this.get()
    const updated = this._merge(current, value)
    this.set(updated)
  }

  private _notify_subs(): void {
    this._subs.forEach(subscriber => subscriber())
  }

  private _merge (target: any, source: any): T {
    const output = { ...target }
    
    if (this._is_object(target) && this._is_object(source)) {
      Object.keys(source).forEach(key => {
        if (this._is_object(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] })
          } else {
            output[key] = this._merge(target[key], source[key])
          }
        } else {
          Object.assign(output, { [key]: source[key] })
        }
      })
    }
    return output
  }

  private _is_object(item: any): boolean {
    return (item && typeof item === 'object' && !Array.isArray(item))
  }
}

import { DBController } from '@/demo/store/controller.js'

import {
  createContext,
  useContext,
  useState
} from 'react'

import type { ReactNode } from 'react'

interface StoreAPI <T> {
  data   : T
  update : (store: Partial<T>) => void
  reset  : () => void
}

interface StoreProviderProps {
  children : ReactNode
}

export function createStoreProvider<T> (
  controller : DBController<T>
) {

  const Context = createContext<StoreAPI<T> | null>(null)

  const StoreProvider = ({ children }: StoreProviderProps): JSX.Element => {
    const [ _store, _setStore ] = useState<T>(controller.get())

    const reset = () => {
      controller.reset()
      _setStore(controller.get_defaults())
    }

    const update = (store: Partial<T>) => {
      const new_store = { ..._store, ...store }
      controller.set(new_store)
      _setStore(new_store)
    }

    return (
      <Context.Provider value={{ data : _store, reset, update }}>
        {children}
      </Context.Provider>
    )
  }

  const useStore = () => {
    const ctx = useContext(Context)
    if (ctx === null) {
      throw new Error('useStore must be used within a StoreProvider')
    }
    return ctx
  }

  return {
    StoreProvider,
    useStore
  }

}

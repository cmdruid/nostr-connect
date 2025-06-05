import { DEFAULT_STORE, STORE_KEY } from '@/demo/const.js'
import { DBController }             from '@/demo/store/controller.js'
import { createStoreProvider }      from '@/demo/store/context.js'

import type { AppStore } from '@/demo/types/index.js'

const params = new URLSearchParams(window.location.search)
const name   = params.get('name')

const store_key = name ?
  `${STORE_KEY}-${name}`
  : STORE_KEY

export const StoreDB = new DBController<AppStore>(store_key, DEFAULT_STORE)
export const { StoreProvider, useStore } = createStoreProvider(StoreDB)

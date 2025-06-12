import { StrictMode }     from 'react'
import { createRoot }     from 'react-dom/client'
import { ClientProvider } from '@/demo/context/client.js'
import { StoreProvider }  from '@/demo/context/store.js'
import { LogsProvider }   from '@/demo/context/logs.js'
import { App }            from '@/demo/components/layout/app.js'

import '@/demo/styles/global.css'
import '@/demo/styles/layout.css'
import '@/demo/styles/node.css'
import '@/demo/styles/settings.css'

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      })
      console.log('[ app ] service worker registered with scope:', registration.scope)
    } catch (error) {
      console.error('[ app ] service worker registration failed:', error)
    }
  })
}

// Fetch the root container.
const container = document.getElementById('root')

// If the root container is not found, throw an error.
if (!container) throw new Error('[ app ] root container not found')

// Create the react root element.
const root = createRoot(container)

// Render the app.
root.render(
  <StrictMode>
    <StoreProvider>
      <LogsProvider>
        <ClientProvider>
          <App />
        </ClientProvider>
      </LogsProvider>
    </StoreProvider>
  </StrictMode>
)

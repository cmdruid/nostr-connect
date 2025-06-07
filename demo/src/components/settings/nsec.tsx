import { useEffect, useState }      from 'react'
import { useStore }                 from '@/demo/context/store.js'
import { generateSecretKey, nip19 } from 'nostr-tools'

export function NsecConfig() {
  const store = useStore()

  const [nsec, setNsec] = useState<string>(store.data.nsec || '')
  const [changes, setChanges] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<boolean>(false)

  // Generate a new nsec key
  const generateNewKey = () => {
    const seckey = generateSecretKey()
    const nsec = nip19.nsecEncode(seckey)
    handleNsecChange(nsec)
  }

  // Update the nsec in the store
  const update = () => {
    store.update({ nsec })
    setChanges(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  // Discard changes by resetting local state from store
  const cancel = () => {
    setNsec(store.data.nsec || '')
    setChanges(false)
  }

  // Validate nsec format
  const validateNsec = (value: string): boolean => {
    // Basic validation - nsec should start with 'nsec1' and be a valid bech32 string
    return value.startsWith('nsec1') && value.length > 10
  }

  // Handle nsec input changes
  const handleNsecChange = (value: string) => {
    setNsec(value)
    if (value && !validateNsec(value)) {
      setError('Invalid nsec format')
    } else {
      setError(null)
    }
    setChanges(true)
  }

  useEffect(() => {
    setNsec(store.data.nsec || '')
  }, [store.data.nsec])

  return (
    <div className="container">
      <h2 className="section-header">Nostr Secret Key</h2>
      <p className="description">Configure your Nostr secret key (nsec) for signing events. This key should be kept secure and never shared.</p>
      
      <div className="input-group">
        <input
          type="password"
          value={nsec}
          onChange={(e) => handleNsecChange(e.target.value)}
          placeholder="nsec1..."
          className="nsec-input"
        />
        <button 
          onClick={generateNewKey}
          className="button button-secondary"
        >
          Generate New Key
        </button>
      </div>
      
      <div className="action-buttons">
        <button 
          onClick={update}
          disabled={!changes || !!error}
          className={`button button-primary action-button ${saved ? 'saved-button' : ''}`}
        >
          {saved ? 'Saved' : 'Save'}
        </button>
        
        {changes && (
          <button 
            onClick={cancel}
            className="button"
          >
            Cancel
          </button>
        )}
        <div className="notification-container">
          {error && <p className="error-text">{error}</p>}
        </div>
      </div>
    </div>
  )
} 
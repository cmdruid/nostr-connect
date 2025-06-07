import { useClientCtx } from '@/demo/context/client.js'
import { nip19 }        from 'nostr-tools'

export function NodeInfo () {
  const client = useClientCtx()

  const npub = client.ref
    ? nip19.npubEncode(client.ref.pubkey)
    : 'unknown'

  return (
    <div className="dashboard-container">
      <h2 className="section-header">Node Status</h2>
      <pre>npub: {npub}</pre>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <span>status:</span>
        <span className={`status-indicator ${client.status}`}>{client.status}</span>
      </div>
      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
        <button className="button" onClick={() => client.reset()}>Reset Node</button>
      </div>
    </div>
  )
}

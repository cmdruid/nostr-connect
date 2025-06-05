import { useStore } from '@/demo/store/index.js'
import { useState } from 'react'
import '@/demo/styles/console.css'

// Assuming log entries might have a 'payload' for JSON data
// interface LogEntryType {
//   timestamp: number;
//   type: string;
//   message: string;
//   payload?: any;
// }

export function Console () {
  const store = useStore()
  
  const [expandedIndices, setExpandedIndices] = useState<Record<number, boolean>>({})

  const toggleExpand = (idx: number) => {
    setExpandedIndices(prev => ({ ...prev, [idx]: !prev[idx] }))
  }

  // Clear logs handler
  const clear_logs = async () => {
    store.update({ logs: [] })
    setExpandedIndices({})
  }

  return (
    <div className="console-container">
      <div className="console-header-controls">
        <h2 className="section-header">
          Event Log <span className="event-count">({store.data.logs.length} events)</span>
        </h2>
        <button className="button clear-button" onClick={clear_logs} title="Clear logs">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
        </button>
      </div>
      <p className="description">Monitor events from your bifrost node.</p>
      
      <div className="console-output">
        {store.data.logs.length === 0 ? (
          <div className="console-empty">No events logged yet</div>
        ) : (
          store.data.logs.map((log, idx) => (
            <div key={idx} className={`console-entry ${log.payload ? 'expandable' : ''}`}>
              <div className="entry-header" onClick={() => log.payload && toggleExpand(idx)}>
                <div className="entry-prefix">
                  {log.payload && (
                    <span className={`chevron ${expandedIndices[idx] ? 'expanded' : ''}`}>
                      {expandedIndices[idx] ? '▼' : '▶'}
                    </span>
                  )}
                  <span className="console-timestamp">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  {log.type && <span className={`console-badge console-type-${log.type.toLowerCase()}`}>{log.type}</span>}
                </div>
                <span className={`console-message`}>{log.message}</span>
              </div>
              {log.payload && expandedIndices[idx] && (
                <div className="console-payload">
                  <pre>{JSON.stringify(log.payload, null, 2)}</pre>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Removed the old clear button location as it's moved to the header */}
      {/* <div className="console-controls">
        <button className="button" onClick={clear_logs}>Clear Console</button>
      </div> */}
    </div>
  )
}

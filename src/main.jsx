import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import BackendGate from './BackendGate.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BackendGate />
  </StrictMode>,
)

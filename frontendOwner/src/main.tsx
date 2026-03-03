import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import MainApp from './app/MainApp.tsx'

// render MainApp as the new application entry point; App.tsx is left intact for reference
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MainApp />
  </StrictMode>,
)

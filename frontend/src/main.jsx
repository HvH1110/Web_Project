import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'
import '@fontsource/vt323'
import GalaxyBackground, { GalaxyCredit } from './components/GalaxyBackground.jsx'
import { router } from './router.jsx'
import './index.css'
import './styles/mocr.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GalaxyBackground />
    <RouterProvider router={router} />
    <GalaxyCredit />
  </StrictMode>,
)

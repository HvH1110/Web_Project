import { createBrowserRouter } from 'react-router'
import App from '@/App'
import HomePage from '@/pages/HomePage'
import NotFoundPage from '@/pages/NotFoundPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <HomePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  // Full-screen dashboard with its own header, outside the App layout.
  // Lazy so its chart library stays out of the main bundle.
  {
    path: '/mission-control',
    hydrateFallbackElement: <div className="min-h-svh" />,
    lazy: async () => ({
      Component: (await import('@/pages/MissionControlPage')).default,
    }),
  },
])

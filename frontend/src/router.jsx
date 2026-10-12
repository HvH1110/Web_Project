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
      // Design system reference, dev builds only.
      ...(import.meta.env.DEV
        ? [
            {
              path: 'styleguide',
              lazy: async () => ({
                Component: (await import('@/pages/StyleguidePage')).default,
              }),
            },
          ]
        : []),
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

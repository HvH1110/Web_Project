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
      // Lazy, so catalog pages and their widgets stay out of the home page bundle.
      {
        path: 'brands/:slug',
        lazy: async () => ({ Component: (await import('@/pages/BrandPage')).default }),
      },
      {
        path: 'search',
        lazy: async () => ({ Component: (await import('@/pages/SearchPage')).default }),
      },
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

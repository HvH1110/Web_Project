import { createBrowserRouter } from 'react-router'
import App from '@/App'
import HomePage from '@/pages/HomePage'
import NotFoundPage from '@/pages/NotFoundPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    // Shown for a moment while a lazy page loads on the first visit.
    hydrateFallbackElement: <div className="min-h-svh" />,
    children: [
      { index: true, element: <HomePage /> },
      // Lazy, so catalog pages and their widgets stay out of the home page bundle.
      {
        path: 'brands/:slug',
        lazy: async () => ({ Component: (await import('@/pages/BrandPage')).default }),
      },
      {
        path: 'products/:brand/:ref',
        lazy: async () => ({ Component: (await import('@/pages/ProductPage')).default }),
      },
      {
        path: 'deals',
        lazy: async () => ({ Component: (await import('@/pages/DealsPage')).default }),
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

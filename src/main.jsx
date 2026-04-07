import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HelmetProvider } from 'react-helmet-async'
import App from './App.jsx'
import AppErrorBoundary from '@/components/app/AppErrorBoundary'
import { ThemeProvider } from '@/hooks/useTheme'
import './index.css'

function shouldRetryQuery(failureCount, error) {
  if (error?.status === 429) return false
  return failureCount < 1
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: shouldRetryQuery,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <AppErrorBoundary>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <BrowserRouter
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
              }}
            >
              <App />
            </BrowserRouter>
          </QueryClientProvider>
        </ThemeProvider>
      </AppErrorBoundary>
    </HelmetProvider>
  </React.StrictMode>,
)

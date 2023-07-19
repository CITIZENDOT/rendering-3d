import 'bootstrap/dist/css/bootstrap.min.css'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'

import App from './App.jsx'
import Benchmark from './routes/benchmark.jsx'
import ErrorPage from './routes/error-page.jsx'

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: <ErrorPage />
  },
  {
    path: '/measure-ktx2',
    element: <Benchmark />,
    errorElement: <ErrorPage />
  }
], { basename: import.meta.env.DEV ? '/' : '/rendering-3d/' })

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)

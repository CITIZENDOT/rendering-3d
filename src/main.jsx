import 'bootstrap/dist/css/bootstrap.min.css'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'

import App from './App.jsx'
import BenchmarkKTX2 from './routes/measure-ktx2.jsx'
import ErrorPage from './routes/error-page.jsx'
import VRAMBenchmark from './routes/benchmark.jsx'

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: <ErrorPage />
  },
  {
    path: '/measure-ktx2',
    element: <BenchmarkKTX2 />,
    errorElement: <ErrorPage />
  },
  {
    path: '/measure-vram',
    element: <VRAMBenchmark />,
    errorElement: <ErrorPage />
  }
])

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)

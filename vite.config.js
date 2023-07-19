import react from '@vitejs/plugin-react-swc'
import { defineConfig } from 'vite'

export default defineConfig(({ command }) => {
  const config = {
    plugins: [react()],
    base: '/rendering-3d/',
  }

  return config
})
import react from '@vitejs/plugin-react-swc'
import { defineConfig } from 'vite'

export default defineConfig(({ command }) => {
  const config = {
    plugins: [react()]
  }

  return config
})
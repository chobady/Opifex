import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 700,
    rolldownOptions: {
      output: {
        // Librerie in pacchetti a parte: cambiano di rado, quindi l'iPhone le tiene in cache
        // anche quando pubblico una nuova versione dell'app.
        codeSplitting: {
          groups: [
            { name: 'firebase', test: /node_modules[\\/](@firebase|firebase|re2js|idb|tslib)/ },
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
            { name: 'icons', test: /node_modules[\\/]lucide-react/ },
          ],
        },
      },
    },
  },
});

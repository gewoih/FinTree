import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath } from 'node:url';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = env.VITE_API_PROXY_TARGET;

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('/vue/') || id.includes('vue-router') || id.includes('pinia'))
                return 'vue-vendor';
              if (id.includes('@primeuix'))
                return 'primevue-theme';
              if (id.includes('primevue/datatable') || id.includes('primevue/column'))
                return 'primevue-table';
              if (id.includes('primevue/datepicker') || id.includes('primevue/select') || id.includes('primevue/inputnumber'))
                return 'primevue-form';
              if (id.includes('primevue'))
                return 'primevue-core';
              if (id.includes('chart.js') || id.includes('vue-chartjs'))
                return 'charts';
            }
          }
        }
      }
    },
    server: {
      port: 8080,
      host: true,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    }
  };
});

import './style.css'
import './styles/utilities.css'
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';

import PrimeVue from 'primevue/config';
import Aura from '@primeuix/themes/aura';
import "primeicons/primeicons.css";
import ToastService from 'primevue/toastservice';

const app = createApp(App);

app.use(createPinia());
app.use(ToastService);

app.use(PrimeVue, {
    theme: {
        preset: Aura
    }
});

app.mount('#app')

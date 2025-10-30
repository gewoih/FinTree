import './style.css';
import './styles/theme.css';
import './styles/prime-overrides.css';
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';

import PrimeVue from 'primevue/config';
import Aura from '@primeuix/themes/aura';
import "primeicons/primeicons.css";
import ToastService from 'primevue/toastservice';
import ConfirmationService from 'primevue/confirmationservice';

const app = createApp(App);

app.use(createPinia());
app.use(ToastService);
app.use(ConfirmationService);
app.use(router);

app.use(PrimeVue, {
    theme: {
        preset: Aura
    }
});

app.mount('#app')

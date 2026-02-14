import './assets/design-tokens.css';
import './style.css';
import './styles/theme.css';
import './styles/prime-overrides.css';
import './primevue-theme.css';
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';

import PrimeVue from 'primevue/config';
import Aura from '@primeuix/themes/aura';
import "primeicons/primeicons.css";
import ToastService from 'primevue/toastservice';
import ConfirmationService from 'primevue/confirmationservice';
import Tooltip from 'primevue/tooltip';
import { registerComponents } from './components';

const app = createApp(App);

app.use(createPinia());
app.use(ToastService);
app.use(ConfirmationService);
app.use(router);

app.use(PrimeVue, {
    theme: {
        preset: Aura,
        options: {
            darkModeSelector: '.dark-mode',
            cssLayer: {
                name: 'primevue',
                order: 'reset, primevue'
            }
        }
    }
});

app.directive('tooltip', Tooltip);

registerComponents(app);

app.mount('#app')

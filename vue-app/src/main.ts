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
import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';
import "primeicons/primeicons.css";
import ToastService from 'primevue/toastservice';
import ConfirmationService from 'primevue/confirmationservice';
import Tooltip from 'primevue/tooltip';
import { registerComponents } from './components';

const FinTreePreset = definePreset(Aura, {
    semantic: {
        primary: {
            50: '#F0F4FF',
            100: '#DDE6FF',
            200: '#BAC9FF',
            300: '#8BA4F0',
            400: '#6B82DB',
            500: '#4F63B8',
            600: '#3F509E',
            700: '#334085',
            800: '#27316B',
            900: '#1C2352',
            950: '#111538',
        },
    },
});

const ruLocale = {
    dayNames: ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'],
    dayNamesShort: ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'],
    dayNamesMin: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
    monthNames: ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'],
    monthNamesShort: ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'],
    today: 'Сегодня',
    clear: 'Очистить',
    weekHeader: 'Нед',
    firstDayOfWeek: 1,
    dateFormat: 'dd.mm.yy',
    chooseDate: 'Выберите дату',
    chooseMonth: 'Выберите месяц',
    chooseYear: 'Выберите год',
    prevMonth: 'Предыдущий месяц',
    nextMonth: 'Следующий месяц',
};

const app = createApp(App);

app.use(createPinia());
app.use(ToastService);
app.use(ConfirmationService);
app.use(router);

app.use(PrimeVue, {
    locale: ruLocale,
    theme: {
        preset: FinTreePreset,
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

import './assets/design-tokens.css';
import './style.css';
import './styles/theme.css';
import './styles/prime-unstyled-shared.css';
import './styles/prime-overrides.css';
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';

import PrimeVue from 'primevue/config';
import "primeicons/primeicons.css";
import ToastService from 'primevue/toastservice';
import ConfirmationService from 'primevue/confirmationservice';
import Tooltip from 'primevue/tooltip';
import { registerComponents } from './components';

const THEME_STORAGE_KEY = 'fintree-theme';

const applyInitialThemeClass = () => {
    if (typeof document === 'undefined') return;

    let initialTheme: 'dark' | 'light' = 'dark';

    if (typeof window !== 'undefined') {
        try {
            const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
            if (storedTheme === 'dark' || storedTheme === 'light') {
                initialTheme = storedTheme;
            }
        } catch {
            initialTheme = 'dark';
        }
    }

    const root = document.documentElement;
    root.classList.toggle('dark-mode', initialTheme === 'dark');
    root.classList.toggle('light-mode', initialTheme === 'light');
};

applyInitialThemeClass();

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
    unstyled: true,
});

app.directive('tooltip', Tooltip);

registerComponents(app);

app.mount('#app')

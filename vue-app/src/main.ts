import './assets/design-tokens.css';
import './style.css';
import './styles/theme.css';
import { createApp, type DirectiveBinding, type VNode } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';

import PrimeVue from 'primevue/config';
import "primeicons/primeicons.css";
import ToastService from 'primevue/toastservice';
import ConfirmationService from 'primevue/confirmationservice';
import Tooltip from 'primevue/tooltip';
import { registerComponents } from './components';
import { FinTreePrimePreset } from './theme/fintree-prime-preset';

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
    unstyled: false,
    theme: {
        preset: FinTreePrimePreset,
        options: {
            darkModeSelector: '.dark-mode',
            cssLayer: {
                name: 'primevue',
                order: 'reset, tokens, base, components, primevue, overrides',
            },
        },
    },
    zIndex: {
        modal: 1040,
        overlay: 1050,
        menu: 1050,
        tooltip: 1070,
    },
});

// Patch PrimeVue Tooltip for touch devices.
// Root cause: PrimeVue always binds mouseenter→show and click→hide. On a touch
// tap the browser synthesises both in sequence, so the tooltip shows then
// immediately hides. Calling preventDefault() on touchend suppresses the entire
// synthetic mouse-event chain, and we do the toggle ourselves.
// NOTE: Tooltip is a Vue directive object { beforeMount, updated, unmounted, ... },
// not { methods: {...} } — methods live on per-element instances at el._$instances.

interface TooltipTarget extends HTMLElement {
    $_ptooltipId?: string;
    $_ptooltipHideDelay?: number;
    $_ptooltipShowDelay?: number;
    $_ftTouchEnd?: ((e: TouchEvent) => void) | null;
}
interface TooltipInstance {
    getTarget(el: HTMLElement): TooltipTarget;
    show(target: TooltipTarget, binding: DirectiveBinding, delay?: number): void;
    hide(target: TooltipTarget, delay?: number): void;
}
interface TooltipEl extends HTMLElement {
    $instance?: TooltipInstance;
    $_ftTarget?: TooltipTarget;
}
type TooltipHook = (el: TooltipEl, binding: DirectiveBinding, vnode: VNode, prevVnode: VNode | null) => void;
interface PatchableTooltip {
    beforeMount?: TooltipHook;
    updated?: TooltipHook;
    unmounted?: TooltipHook;
}

const _origTooltipBeforeMount = (Tooltip as PatchableTooltip).beforeMount!;
const _origTooltipUpdated = (Tooltip as PatchableTooltip).updated!;
const _origTooltipUnmounted = (Tooltip as PatchableTooltip).unmounted!;

function _ftBindTouch(el: TooltipEl, binding: DirectiveBinding): void {
    const instance = el.$instance;
    if (!instance) return;
    const target: TooltipTarget = instance.getTarget(el);
    el.$_ftTarget = target;
    target.$_ftTouchEnd = (e: TouchEvent) => {
        e.preventDefault(); // suppress synthetic mouseenter + click
        if (target.$_ptooltipId) {
            instance.hide(target, target.$_ptooltipHideDelay);
        } else {
            instance.show(target, binding, target.$_ptooltipShowDelay);
        }
    };
    target.addEventListener('touchend', target.$_ftTouchEnd, { passive: false });
}

function _ftUnbindTouch(el: TooltipEl): void {
    const target = el.$_ftTarget;
    if (target?.$_ftTouchEnd) {
        target.removeEventListener('touchend', target.$_ftTouchEnd);
        target.$_ftTouchEnd = null;
    }
    el.$_ftTarget = undefined;
}

(Tooltip as PatchableTooltip).beforeMount = function (el: TooltipEl, binding: DirectiveBinding, vnode: VNode, prevVnode: VNode | null) {
    _origTooltipBeforeMount.call(this, el, binding, vnode, prevVnode);
    _ftBindTouch(el, binding);
};

(Tooltip as PatchableTooltip).updated = function (el: TooltipEl, binding: DirectiveBinding, vnode: VNode, prevVnode: VNode | null) {
    _ftUnbindTouch(el);
    _origTooltipUpdated.call(this, el, binding, vnode, prevVnode);
    _ftBindTouch(el, binding);
};

(Tooltip as PatchableTooltip).unmounted = function (el: TooltipEl, binding: DirectiveBinding, vnode: VNode, prevVnode: VNode | null) {
    _ftUnbindTouch(el);
    _origTooltipUnmounted.call(this, el, binding, vnode, prevVnode);
};

app.directive('tooltip', Tooltip);

registerComponents(app);

app.mount('#app')

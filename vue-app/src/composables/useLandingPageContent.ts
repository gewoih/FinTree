import accountsImage from '@/assets/landing/accounts.png'
import investmentsImage from '@/assets/landing/investments.png'
import forecastImage from '@/assets/landing/forecast.png'

export const features = [
  {
    icon: 'pi-bolt',
    title: 'Быстрый старт без барьеров',
    description: 'Регистрация занимает пару минут, а первый месяц вы пользуетесь бесплатно.'
  },
  {
    icon: 'pi-chart-line',
    title: 'Ясная картина расходов',
    description: 'FinTree сразу показывает, куда уходит бюджет и где можно сэкономить.'
  },
  {
    icon: 'pi-shield',
    title: 'Контроль и безопасность',
    description: 'Вы сами управляете данными, без привязки банковской карты на старте.'
  }
] as const

export const pricing = [
  {
    name: 'Месяц',
    price: '390 ₽',
    period: 'в месяц',
    note: 'После бесплатного месяца',
    description: 'Помесячная оплата без долгих обязательств.',
    accent: false
  },
  {
    name: 'Год',
    oldPrice: '4 680 ₽',
    price: '3 900 ₽',
    period: 'в год',
    note: '325 ₽ в месяц после триала',
    description: 'Экономия 780 ₽ в год.',
    accent: true,
    badge: 'Лучший выбор',
    discount: '-17%'
  }
] as const

export const dashboardScreens = [
  {
    title: 'Страница счетов',
    description: 'Все счета в одном месте.',
    image: accountsImage,
    alt: 'Скриншот страницы счетов в FinTree'
  },
  {
    title: 'Учет инвестиций',
    description: 'Портфель и динамика без ручной сводки.',
    image: investmentsImage,
    alt: 'Скриншот страницы инвестиций в FinTree'
  },
  {
    title: 'Прогноз расходов',
    description: 'Сколько денег нужно до конца месяца.',
    image: forecastImage,
    alt: 'Скриншот прогноза расходов в FinTree'
  }
] as const

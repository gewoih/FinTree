import type { App } from 'vue'

// Common components
import AppButton from './common/AppButton.vue'
import AppCard from './common/AppCard.vue'
import EmptyState from './common/EmptyState.vue'
import FormField from './common/FormField.vue'
import KPICard from './common/KPICard.vue'
import PageHeader from './common/PageHeader.vue'
import StatusBadge from './common/StatusBadge.vue'

// PrimeVue components
import Button from 'primevue/button'
import Card from 'primevue/card'
import Skeleton from 'primevue/skeleton'
import Menu from 'primevue/menu'
import Sidebar from 'primevue/sidebar'
import Drawer from 'primevue/drawer'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import DatePicker from 'primevue/datepicker'
import Dialog from 'primevue/dialog'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
import Tag from 'primevue/tag'
import Checkbox from 'primevue/checkbox'
import Chart from 'primevue/chart'

export function registerComponents(app: App) {
  // Common components
  app.component('AppButton', AppButton)
  app.component('AppCard', AppCard)
  app.component('EmptyState', EmptyState)
  app.component('FormField', FormField)
  app.component('KPICard', KPICard)
  app.component('PageHeader', PageHeader)
  app.component('StatusBadge', StatusBadge)

  // PrimeVue components
  app.component('Button', Button)
  app.component('Card', Card)
  app.component('Skeleton', Skeleton)
  app.component('Menu', Menu)
  app.component('Sidebar', Sidebar)
  app.component('Drawer', Drawer)
  app.component('DataTable', DataTable)
  app.component('Column', Column)
  app.component('InputText', InputText)
  app.component('InputNumber', InputNumber)
  app.component('Textarea', Textarea)
  app.component('Select', Select)
  app.component('DatePicker', DatePicker)
  app.component('Dialog', Dialog)
  app.component('Toast', Toast)
  app.component('ConfirmDialog', ConfirmDialog)
  app.component('Tag', Tag)
  app.component('Checkbox', Checkbox)
  app.component('Chart', Chart)
}

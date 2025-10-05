import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import { setupSessionPersistence, loadSessionData } from './plugins/sessionPersistence'
import { useRetirementStore } from './stores/retirement'
import { useIncomeStore } from './stores/income'
import { useExpenseStore } from './stores/expense'
import { useCPFStore } from './stores/cpf'

const app = createApp(App)
app.use(createPinia())

// Initialize stores
const retirementStore = useRetirementStore()
const incomeStore = useIncomeStore()
const expenseStore = useExpenseStore()
const cpfStore = useCPFStore()

const stores = {
  retirement: retirementStore,
  income: incomeStore,
  expense: expenseStore,
  cpf: cpfStore
}

// Load saved session data
loadSessionData(stores)

// Setup auto-save on any store changes
setupSessionPersistence(stores)

app.mount('#app')

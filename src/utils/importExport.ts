import type { RetirementData, UserData } from '@/types'

/**
 * Export retirement data to JSON
 */
export function exportData(userData: UserData): RetirementData {
  return {
    exportDate: new Date().toISOString(),
    user: userData
  }
}

/**
 * Download JSON data as a file
 */
export function downloadJSON(data: RetirementData, filename = 'retirement-data.json'): void {
  const jsonString = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonString], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

/**
 * Validate imported data structure
 */
export function validateImportedData(data: unknown): data is RetirementData {
  if (typeof data !== 'object' || data === null) {
    return false
  }

  const obj = data as Record<string, unknown>

  // Check required fields
  if (typeof obj.exportDate !== 'string') return false
  if (typeof obj.user !== 'object' || obj.user === null) return false

  const user = obj.user as Record<string, unknown>

  // Validate core user data fields
  if (typeof user.currentAge !== 'number') return false
  if (typeof user.retirementAge !== 'number') return false
  if (typeof user.currentSavings !== 'number') return false
  if (typeof user.expectedReturnRate !== 'number') return false
  if (typeof user.inflationRate !== 'number') return false

  // Validate income sources if present (optional)
  if (user.incomeSources !== undefined) {
    if (!Array.isArray(user.incomeSources)) return false
    for (const source of user.incomeSources) {
      if (typeof source !== 'object' || source === null) return false
      const s = source as Record<string, unknown>
      if (typeof s.id !== 'string') return false
      if (typeof s.name !== 'string') return false
      if (typeof s.amount !== 'number') return false
      if (typeof s.startDate !== 'string') return false
    }
  }

  // Validate one-off returns if present (optional)
  if (user.oneOffReturns !== undefined) {
    if (!Array.isArray(user.oneOffReturns)) return false
    for (const oneOff of user.oneOffReturns) {
      if (typeof oneOff !== 'object' || oneOff === null) return false
      const o = oneOff as Record<string, unknown>
      if (typeof o.id !== 'string') return false
      if (typeof o.date !== 'string') return false
      if (typeof o.amount !== 'number') return false
      if (typeof o.description !== 'string') return false
    }
  }

  // Validate expenses if present (optional)
  if (user.expenses !== undefined) {
    if (!Array.isArray(user.expenses)) return false
    for (const expense of user.expenses) {
      if (typeof expense !== 'object' || expense === null) return false
      const e = expense as Record<string, unknown>
      if (typeof e.id !== 'string') return false
      if (typeof e.name !== 'string') return false
      if (typeof e.category !== 'string') return false
      if (typeof e.monthlyAmount !== 'number') return false
      if (typeof e.inflationRate !== 'number') return false
      // startDate and endDate are optional
      if (e.startDate !== undefined && typeof e.startDate !== 'string') return false
      if (e.endDate !== undefined && typeof e.endDate !== 'string') return false
    }
  }

  // Phase 5: Validate loans if present (optional)
  if (user.loans !== undefined) {
    if (!Array.isArray(user.loans)) return false
    for (const loan of user.loans) {
      if (typeof loan !== 'object' || loan === null) return false
      const l = loan as Record<string, unknown>
      if (typeof l.id !== 'string') return false
      if (typeof l.name !== 'string') return false
      if (typeof l.principal !== 'number') return false
      if (typeof l.interestRate !== 'number') return false
      if (typeof l.termMonths !== 'number') return false
      if (typeof l.startDate !== 'string') return false
      // extraPayments is optional
      if (l.extraPayments !== undefined) {
        if (!Array.isArray(l.extraPayments)) return false
        for (const payment of l.extraPayments) {
          if (typeof payment !== 'object' || payment === null) return false
          const p = payment as Record<string, unknown>
          if (typeof p.date !== 'string') return false
          if (typeof p.amount !== 'number') return false
        }
      }
    }
  }

  // Phase 5: Validate one-time expenses if present (optional)
  if (user.oneTimeExpenses !== undefined) {
    if (!Array.isArray(user.oneTimeExpenses)) return false
    for (const expense of user.oneTimeExpenses) {
      if (typeof expense !== 'object' || expense === null) return false
      const e = expense as Record<string, unknown>
      if (typeof e.id !== 'string') return false
      if (typeof e.name !== 'string') return false
      if (typeof e.amount !== 'number') return false
      if (typeof e.date !== 'string') return false
      if (typeof e.category !== 'string') return false
      // description is optional
      if (e.description !== undefined && typeof e.description !== 'string') return false
    }
  }

  return true
}

/**
 * Parse and validate imported JSON file
 */
export async function parseImportedFile(file: File): Promise<RetirementData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (event) => {
      try {
        const text = event.target?.result as string
        const data = JSON.parse(text)

        if (!validateImportedData(data)) {
          reject(new Error('Invalid data format. Please check the file and try again.'))
          return
        }

        resolve(data)
      } catch (error) {
        reject(new Error('Failed to parse JSON file. Please ensure it is a valid JSON file.'))
      }
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }

    reader.readAsText(file)
  })
}

<template>
  <div class="flex flex-row items-center justify-end gap-2">
    <button
      @click="handleExport"
      class="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium py-1.5 px-2 sm:py-2 sm:px-4 rounded-md transition-colors"
      title="Export data to JSON file"
    >
      Export
    </button>

    <button
      @click="triggerFileInput"
      class="bg-green-600 hover:bg-green-700 text-white text-xs font-medium py-1.5 px-2 sm:py-2 sm:px-4 rounded-md transition-colors"
      title="Import data from JSON file"
    >
      Import
    </button>

    <button
      @click="handleClear"
      class="bg-red-600 hover:bg-red-700 text-white text-xs font-medium py-1.5 px-2 sm:py-2 sm:px-4 rounded-md transition-colors"
      title="Clear all data"
    >
      Clear
    </button>

    <input
      ref="fileInput"
      type="file"
      accept=".json"
      @change="handleImport"
      class="hidden"
    />

    <p v-if="message" class="text-xs sm:text-sm ml-2" :class="messageClass">
      {{ message }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRetirementStore } from '@/stores/retirement'
import { exportData, downloadJSON, parseImportedFile } from '@/utils/importExport'
import { clearSessionData } from '@/plugins/sessionPersistence'

const store = useRetirementStore()
const fileInput = ref<HTMLInputElement | null>(null)
const message = ref('')
const isError = ref(false)

const messageClass = computed(() => isError.value ? 'text-red-600' : 'text-green-600')

function handleExport() {
  try {
    const data = exportData(store.userData)
    const filename = `retirement-data-${new Date().toISOString().split('T')[0]}.json`
    downloadJSON(data, filename)

    message.value = 'Exported!'
    isError.value = false

    setTimeout(() => {
      message.value = ''
    }, 3000)
  } catch (error) {
    message.value = 'Export failed'
    isError.value = true
  }
}

function triggerFileInput() {
  fileInput.value?.click()
}

async function handleImport(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (!file) {
    return
  }

  try {
    const data = await parseImportedFile(file)

    store.loadData(data.user)

    message.value = 'Imported!'
    isError.value = false

    setTimeout(() => {
      message.value = ''
    }, 3000)
  } catch (error) {
    message.value = error instanceof Error ? error.message : 'Import failed'
    isError.value = true
  } finally {
    // Reset file input
    if (target) {
      target.value = ''
    }
  }
}

function handleClear() {
  if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
    try {
      store.clearAll()
      clearSessionData()

      message.value = 'Cleared!'
      isError.value = false

      setTimeout(() => {
        message.value = ''
      }, 3000)
    } catch (error) {
      message.value = 'Clear failed'
      isError.value = true
    }
  }
}
</script>

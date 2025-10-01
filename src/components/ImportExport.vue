<template>
  <div class="bg-white rounded-lg shadow-md p-6 mt-6">
    <h2 class="text-2xl font-bold text-gray-900 mb-4">
      Save & Load Data
    </h2>

    <div class="flex flex-col sm:flex-row gap-4">
      <button
        @click="handleExport"
        class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
      >
        Export Data
      </button>

      <button
        @click="triggerFileInput"
        class="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
      >
        Import Data
      </button>

      <input
        ref="fileInput"
        type="file"
        accept=".json"
        @change="handleImport"
        class="hidden"
      />
    </div>

    <p v-if="message" class="mt-4 text-sm" :class="messageClass">
      {{ message }}
    </p>

    <p class="mt-4 text-sm text-gray-500">
      Export your data to save it as a JSON file. Import to restore previously saved data.
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRetirementStore } from '@/stores/retirement'
import { exportData, downloadJSON, parseImportedFile } from '@/utils/importExport'

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

    message.value = 'Data exported successfully!'
    isError.value = false

    setTimeout(() => {
      message.value = ''
    }, 3000)
  } catch (error) {
    message.value = 'Failed to export data. Please try again.'
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

    message.value = 'Data imported successfully!'
    isError.value = false

    setTimeout(() => {
      message.value = ''
    }, 3000)
  } catch (error) {
    message.value = error instanceof Error ? error.message : 'Failed to import data'
    isError.value = true
  } finally {
    // Reset file input
    if (target) {
      target.value = ''
    }
  }
}
</script>

<script lang="ts">
import { computed } from 'vue'
</script>

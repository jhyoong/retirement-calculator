<template>
  <div class="flex items-center gap-2">
    <button
      @click="handleExport"
      class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-md transition-colors"
      title="Export data to JSON file"
    >
      Export
    </button>

    <button
      @click="triggerFileInput"
      class="bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 px-4 rounded-md transition-colors"
      title="Import data from JSON file"
    >
      Import
    </button>

    <input
      ref="fileInput"
      type="file"
      accept=".json"
      @change="handleImport"
      class="hidden"
    />

    <p v-if="message" class="text-sm ml-2" :class="messageClass">
      {{ message }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
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
</script>

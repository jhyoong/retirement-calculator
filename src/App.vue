<template>
  <div class="min-h-screen bg-gray-50">
    <div class="container mx-auto px-4 py-8 max-w-4xl">
      <header class="mb-8">
        <h1 class="text-4xl font-bold text-gray-900 mb-2">
          Retirement Calculator
        </h1>
        <p class="text-gray-600">
          Plan your financial future with confidence
        </p>
      </header>

      <main>
        <RetirementForm />
        <ResultsDisplay />
        <ImportExport />
      </main>

      <footer class="mt-12 text-center text-sm text-gray-500">
        <p>Phase 1: MVP - Basic Retirement Calculator</p>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import RetirementForm from '@/components/RetirementForm.vue'
import ResultsDisplay from '@/components/ResultsDisplay.vue'
import ImportExport from '@/components/ImportExport.vue'
</script>

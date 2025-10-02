<template>
  <div class="space-y-6">
    <ExpenseForm />
    <LoanForm />
    <OneTimeExpenseForm />
  </div>
</template>

<script setup lang="ts">
import ExpenseForm from './ExpenseForm.vue'
import LoanForm from './LoanForm.vue'
import OneTimeExpenseForm from './OneTimeExpenseForm.vue'
</script>

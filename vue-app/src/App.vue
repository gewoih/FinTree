<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import Toast from 'primevue/toast';
import ConfirmDialog from 'primevue/confirmdialog';
import AppShell from './components/layout/AppShell.vue';

const route = useRoute();
const isPublicRoute = computed(() => route.meta.public === true);
</script>

<template>
  <Toast position="top-right" />
  <ConfirmDialog />

  <AppShell v-if="!isPublicRoute">
    <router-view />
  </AppShell>

  <router-view v-else />
</template>


<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import UiToastHost from './ui/UiToastHost.vue';
import UiConfirmDialogHost from './ui/UiConfirmDialogHost.vue';
import AppShell from './components/layout/AppShell.vue';

const route = useRoute();
const isPublicRoute = computed(() => route.meta.public === true);
</script>

<template>
  <UiToastHost position="top-right" />
  <UiConfirmDialogHost />

  <AppShell v-if="!isPublicRoute">
    <router-view />
  </AppShell>

  <router-view v-else />
</template>

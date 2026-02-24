<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import ConfirmDialog from 'primevue/confirmdialog';
import Toast from 'primevue/toast';
import AppShell from './components/layout/AppShell.vue';

const route = useRoute();
const isPublicRoute = computed(() => route.meta.public === true);
</script>

<template>
  <Toast
    position="top-right"
    append-to="body"
    :auto-z-index="true"
    :base-z-index="1060"
  />
  <ConfirmDialog append-to="body" />

  <AppShell v-if="!isPublicRoute">
    <router-view />
  </AppShell>

  <router-view v-else />
</template>

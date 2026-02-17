<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import CategoryManager from '../components/CategoryManager.vue'
import { useFinanceStore } from '../stores/finance'
import { useUserStore } from '../stores/user'
import PageContainer from '../components/layout/PageContainer.vue'
import PageHeader from '../components/common/PageHeader.vue'
import UiSection from '../ui/UiSection.vue'
import UiButton from '../ui/UiButton.vue'
import UiSkeleton from '../ui/UiSkeleton.vue'
import { markCategoriesOnboardingVisited } from '../utils/onboarding'

const financeStore = useFinanceStore()
const userStore = useUserStore()
const managerRef = ref<InstanceType<typeof CategoryManager> | null>(null)
const isCategoriesReady = computed(() => financeStore.areCategoriesReady)

onMounted(() => {
  markCategoriesOnboardingVisited(userStore.currentUser?.id ?? null)
  financeStore.fetchCategories()
})
</script>

<template>
  <PageContainer class="categories">
    <PageHeader title="Категории">
      <template #actions>
        <UiButton
          label="Новая категория"
          icon="pi pi-plus"
          @click="managerRef?.openModal()"
        />
      </template>
    </PageHeader>

    <UiSection class="categories__content">
      <div
        v-if="!isCategoriesReady"
        class="categories__skeleton"
      >
        <UiSkeleton
          v-for="i in 4"
          :key="i"
          height="120px"
        />
      </div>
      <CategoryManager
        v-else
        ref="managerRef"
      />
    </UiSection>
  </PageContainer>
</template>

<style scoped>
.categories {
  gap: var(--ft-space-8);
}

.categories__content {
  gap: var(--ft-space-6);
}

.categories__skeleton {
  display: grid;
  gap: var(--ft-space-3);
}
</style>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import CategoryManager from '../components/CategoryManager.vue'
import { useFinanceStore } from '../stores/finance'
import { useUserStore } from '../stores/user'
import PageContainer from '../components/layout/PageContainer.vue'
import PageHeader from '../components/common/PageHeader.vue'
import UiButton from '../ui/UiButton.vue'
import Skeleton from 'primevue/skeleton';
import Message from 'primevue/message';
import { markCategoriesOnboardingVisited } from '../utils/onboarding'

const financeStore = useFinanceStore()
const userStore = useUserStore()
const managerRef = ref<InstanceType<typeof CategoryManager> | null>(null)
const isCategoriesReady = computed(() => financeStore.areCategoriesReady)
const categoriesState = computed(() => financeStore.categoriesState)
const categoriesError = computed(() => financeStore.categoriesError)
const hasCategories = computed(() => financeStore.categories.length > 0)
const shouldShowCategoriesSkeleton = computed(
  () => (categoriesState.value === 'idle' || categoriesState.value === 'loading') && !hasCategories.value
)
const shouldShowCategoriesErrorState = computed(
  () => categoriesState.value === 'error' && !hasCategories.value
)

const retryCategories = async () => {
  await financeStore.fetchCategories(true)
}

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

    <section class="categories__content">
      <div
        v-if="shouldShowCategoriesSkeleton"
        class="categories__skeleton"
      >
        <Skeleton
          v-for="i in 4"
          :key="i"
          height="120px"
        />
      </div>

      <div
        v-else-if="shouldShowCategoriesErrorState"
        class="categories__error"
      >
        <Message severity="error">
          {{ categoriesError || 'Не удалось загрузить категории.' }}
        </Message>
        <UiButton
          label="Повторить"
          icon="pi pi-refresh"
          variant="secondary"
          @click="retryCategories"
        />
      </div>

      <template v-else>
        <div
          v-if="categoriesState === 'error'"
          class="categories__error categories__error--inline"
        >
          <Message severity="error">
            {{ categoriesError || 'Не удалось обновить категории. Показаны последние доступные данные.' }}
          </Message>
          <UiButton
            label="Повторить"
            icon="pi pi-refresh"
            variant="secondary"
            @click="retryCategories"
          />
        </div>

        <CategoryManager
          v-if="isCategoriesReady"
          ref="managerRef"
        />
      </template>
    </section>
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

.categories__error {
  display: grid;
  gap: var(--ft-space-3);
  justify-items: start;
}

.categories__error--inline {
  margin-bottom: var(--ft-space-2);
}
</style>

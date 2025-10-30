import { ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import { TOAST_CONFIG } from '../constants';

/**
 * Composable for handling form modal submission logic
 * Provides loading state, toast notifications, and standardized submit handling
 *
 * @param onSubmit - Async function that performs the actual submission
 * @param options - Configuration options for success/error messages
 * @returns Object with isSubmitting state and handleSubmit function
 */
export function useFormModal(
  onSubmit: () => Promise<boolean>,
  options?: {
    successMessage?: string;
    errorMessage?: string;
    warningMessage?: string;
  }
) {
  const isSubmitting = ref(false);
  const toast = useToast();

  const handleSubmit = async (): Promise<boolean> => {
    isSubmitting.value = true;

    try {
      const success = await onSubmit();

      if (success) {
        toast.add({
          severity: 'success',
          summary: 'Успех',
          detail: options?.successMessage || 'Операция выполнена успешно',
          life: TOAST_CONFIG.duration
        });
        return true;
      } else {
        toast.add({
          severity: 'error',
          summary: 'Ошибка',
          detail: options?.errorMessage || 'Не удалось выполнить операцию',
          life: TOAST_CONFIG.duration
        });
        return false;
      }
    } catch (error) {
      console.error('Form submission error:', error);
      toast.add({
        severity: 'error',
        summary: 'Ошибка',
        detail: options?.errorMessage || 'Произошла непредвиденная ошибка',
        life: TOAST_CONFIG.duration
      });
      return false;
    } finally {
      isSubmitting.value = false;
    }
  };

  const showWarning = (message?: string) => {
    toast.add({
      severity: 'warn',
      summary: 'Внимание',
      detail: message || options?.warningMessage || 'Проверьте введенные данные',
      life: TOAST_CONFIG.duration
    });
  };

  return {
    isSubmitting,
    handleSubmit,
    showWarning
  };
}

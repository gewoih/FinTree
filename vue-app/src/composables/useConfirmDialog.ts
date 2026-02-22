import { useConfirm } from 'primevue/useconfirm';

interface ConfirmDangerOptions {
  message: string;
  header: string;
  acceptLabel: string;
  icon?: string;
  onAccept: () => void | Promise<void>;
}

interface ConfirmActionOptions {
  message: string;
  header: string;
  acceptLabel: string;
  icon?: string;
  acceptClass?: string;
  onAccept: () => void | Promise<void>;
}

export function useConfirmDialog() {
  const confirm = useConfirm();

  function confirmDanger(opts: ConfirmDangerOptions) {
    confirm.require({
      message: opts.message,
      header: opts.header,
      icon: opts.icon ?? 'pi pi-exclamation-triangle',
      rejectLabel: 'Отмена',
      rejectClass: 'p-button-outlined',
      acceptLabel: opts.acceptLabel,
      acceptClass: 'p-button-danger',
      accept: opts.onAccept,
    });
  }

  function confirmAction(opts: ConfirmActionOptions) {
    confirm.require({
      message: opts.message,
      header: opts.header,
      icon: opts.icon ?? 'pi pi-question-circle',
      rejectLabel: 'Отмена',
      rejectClass: 'p-button-outlined',
      acceptLabel: opts.acceptLabel,
      acceptClass: opts.acceptClass,
      accept: opts.onAccept,
    });
  }

  return { confirmDanger, confirmAction };
}
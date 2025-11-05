import { render } from '@testing-library/vue';
import FormField from '../FormField.vue';

describe('FormField', () => {
  it('renders label, hint, and required indicator', () => {
    const { getByText, getByLabelText } = render({
      components: { FormField },
      template: `
        <FormField label="Название" hint="Подсказка" required>
          <template #default="{ fieldAttrs }">
            <input v-bind="fieldAttrs" />
          </template>
        </FormField>
      `,
    });

    expect(getByText('Название')).toBeInTheDocument();
    expect(getByText('Подсказка')).toBeInTheDocument();
    const input = getByLabelText('Название');
    expect(input).toHaveAttribute('aria-describedby');
  });

  it('shows error messages when provided', () => {
    const { getByText } = render({
      components: { FormField },
      template: `
        <FormField label="Email" :error="['Неверный формат']">
          <template #default="{ fieldAttrs }">
            <input v-bind="fieldAttrs" />
          </template>
        </FormField>
      `,
    });

    expect(getByText('Неверный формат')).toBeInTheDocument();
  });
});

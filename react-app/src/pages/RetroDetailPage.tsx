import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { FormField } from '@/components/common/FormField';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { PATHS } from '@/router/paths';
import { resolveApiErrorMessage } from '@/utils/errors';
import { RetrospectiveRatingField } from '@/features/reflections/RetrospectiveRatingField';
import { RetrospectiveSummarySnapshot } from '@/features/reflections/RetrospectiveSummarySnapshot';
import {
  formatReflectionMonth,
  REFLECTION_RATING_FIELDS,
  REFLECTION_TEXT_FIELDS,
} from '@/features/reflections/reflectionModels';
import { useRetroDetailPage } from '@/features/reflections/useRetroDetailPage';

export default function RetroDetailPage() {
  const {
    navigate,
    month,
    parsedMonth,
    currencyCode,
    isReadOnlyMode,
    form,
    watchedValues,
    detailQuery,
    summaryQuery,
    saveMutation,
    handleSubmit,
    isInitialLoading,
    hasMeaningfulContent,
  } = useRetroDetailPage();

  if (!parsedMonth) {
    return (
      <ErrorBoundary>
        <div className="mx-auto flex max-w-3xl flex-col gap-5 p-4 sm:p-6 lg:px-8">
          <PageHeader title="Некорректный месяц" className="mb-0" />
          <Card className="rounded-2xl border border-destructive/30 bg-destructive/10 shadow-[var(--ft-shadow-sm)]">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-foreground">
                Не удалось открыть рефлексию
              </CardTitle>
              <CardDescription>
                Ссылка содержит некорректный месяц. Вернитесь к списку и выберите период заново.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="min-h-[44px]"
                variant="outline"
                onClick={() => void navigate({ to: PATHS.REFLECTIONS, replace: true })}
              >
                Вернуться к списку
              </Button>
            </CardContent>
          </Card>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="mx-auto flex max-w-5xl flex-col gap-5 p-4 sm:p-6 lg:px-8">
        <PageHeader
          title={formatReflectionMonth(month)}
          subtitle={
            detailQuery.data
              ? 'Отредактируйте оценки и выводы за месяц.'
              : 'Новая запись: зафиксируйте выводы, пока месяц еще свеж в памяти.'
          }
          className="mb-0"
          actions={(
            <Button
              variant="outline"
              className="min-h-[44px] rounded-xl px-4"
              onClick={() => void navigate({ to: PATHS.REFLECTIONS })}
            >
              Назад
            </Button>
          )}
        />

        {isReadOnlyMode ? (
          <div className="rounded-2xl border border-[var(--ft-warning-500)]/30 bg-[var(--ft-warning-500)]/10 px-4 py-3 text-sm">
            <div className="font-medium text-foreground">Режим просмотра</div>
            <div className="mt-1 text-muted-foreground">
              Итоги месяца можно читать, но изменение рефлексии доступно только с активной подпиской.
            </div>
            <Button
              className="mt-3 min-h-[44px]"
              variant="outline"
              onClick={() => void navigate({ to: PATHS.PROFILE })}
            >
              Открыть профиль
            </Button>
          </div>
        ) : null}

        {detailQuery.isError ? (
          <Card className="rounded-2xl border border-destructive/30 bg-destructive/10 shadow-[var(--ft-shadow-sm)]">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-foreground">
                Не удалось загрузить рефлексию
              </CardTitle>
              <CardDescription>
                {resolveApiErrorMessage(
                  detailQuery.error,
                  'Попробуйте повторить запрос или вернитесь к списку месяцев.',
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-3">
              <Button className="min-h-[44px]" variant="outline" onClick={() => void detailQuery.refetch()}>
                Повторить
              </Button>
              <Button className="min-h-[44px]" variant="ghost" onClick={() => void navigate({ to: PATHS.REFLECTIONS })}>
                К списку
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <RetrospectiveSummarySnapshot
              summary={summaryQuery.data}
              currencyCode={currencyCode}
              loading={summaryQuery.isLoading}
              error={
                summaryQuery.isError
                  ? resolveApiErrorMessage(summaryQuery.error, 'Не удалось загрузить итоги месяца.')
                  : null
              }
              onRetry={() => void summaryQuery.refetch()}
            />

            {isInitialLoading ? (
              <>
                <Card className="rounded-2xl border border-border/80 bg-card/95 shadow-[var(--ft-shadow-sm)]">
                  <CardContent className="space-y-4 pt-6">
                    <div className="grid gap-4 lg:grid-cols-3">
                      {Array.from({ length: 3 }, (_, index) => (
                        <Skeleton key={index} className="h-[180px] rounded-2xl" />
                      ))}
                    </div>
                  </CardContent>
                </Card>
                <Card className="rounded-2xl border border-border/80 bg-card/95 shadow-[var(--ft-shadow-sm)]">
                  <CardContent className="grid gap-4 pt-6 xl:grid-cols-2">
                    {Array.from({ length: 4 }, (_, index) => (
                      <Skeleton key={index} className="h-[220px] rounded-2xl" />
                    ))}
                  </CardContent>
                </Card>
              </>
            ) : (
              <form className="space-y-5" onSubmit={handleSubmit} noValidate>
                <Card className="rounded-2xl border border-border/80 bg-card/95 shadow-[var(--ft-shadow-sm)]">
                  <CardHeader className="border-b border-border/70 pb-4">
                    <CardTitle className="text-lg font-semibold text-foreground">Самооценка</CardTitle>
                    <CardDescription>
                      Оцените месяц по трем метрикам. Повторный клик по текущему значению сбросит выбор.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 pt-6 lg:grid-cols-3">
                    {REFLECTION_RATING_FIELDS.map((field) => (
                      <RetrospectiveRatingField
                        key={field.key}
                        label={field.label}
                        hint={field.hint}
                        disabled={saveMutation.isPending || isReadOnlyMode}
                        value={watchedValues[field.key] ?? null}
                        onChange={(value) =>
                          form.setValue(field.key, value, { shouldDirty: true, shouldValidate: true })
                        }
                      />
                    ))}
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border border-border/80 bg-card/95 shadow-[var(--ft-shadow-sm)]">
                  <CardHeader className="border-b border-border/70 pb-4">
                    <CardTitle className="text-lg font-semibold text-foreground">Выводы и план</CardTitle>
                    <CardDescription>
                      Здесь важна не длина текста, а конкретика: что получилось, где были лишние расходы и что изменить в следующем месяце.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 pt-6 xl:grid-cols-2">
                    {REFLECTION_TEXT_FIELDS.map((field) => (
                      <div key={field.key} className="space-y-2">
                        <FormField
                          label={field.label}
                          hint={field.hint}
                          error={form.formState.errors[field.key]?.message as string | undefined}
                        >
                          <Textarea
                            {...form.register(field.key)}
                            maxLength={field.maxLength}
                            disabled={saveMutation.isPending || isReadOnlyMode}
                            placeholder={field.placeholder}
                            className="min-h-[180px] rounded-xl"
                          />
                        </FormField>
                        <div className="text-right text-xs text-muted-foreground">
                          {(watchedValues[field.key] ?? '').length} / {field.maxLength}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {form.formState.errors.root?.message ? (
                  <div className="rounded-2xl border border-[var(--ft-warning-500)]/30 bg-[var(--ft-warning-500)]/10 px-4 py-3 text-sm text-foreground">
                    {form.formState.errors.root.message}
                  </div>
                ) : null}

                <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-[color-mix(in_srgb,var(--ft-surface-raised)_92%,transparent)] px-4 py-4 shadow-[var(--ft-shadow-sm)] sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-muted-foreground">
                    {hasMeaningfulContent
                      ? 'Рефлексия готова к сохранению.'
                      : 'Заполните хотя бы одну оценку или текстовый блок, чтобы сохранить запись.'}
                  </div>
                  <Button
                    type="submit"
                    className="min-h-[44px] rounded-xl px-5"
                    disabled={saveMutation.isPending || !hasMeaningfulContent || isReadOnlyMode}
                  >
                    {saveMutation.isPending ? 'Сохраняем…' : 'Сохранить рефлексию'}
                  </Button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </ErrorBoundary>
  );
}

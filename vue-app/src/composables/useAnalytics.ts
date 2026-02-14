/**
 * Composable для отслеживания событий воронки конверсии
 * События: hero_cta_click, pricing_cta_click, faq_open, sticky_cta_click, signup_start
 */

export type AnalyticsEvent =
  | 'hero_cta_click'
  | 'pricing_cta_click'
  | 'faq_open'
  | 'sticky_cta_click'
  | 'signup_start'
  | 'steps_cta_click'
  | 'final_cta_click'
  | 'nav_cta_click'

interface AnalyticsEventData {
  event: AnalyticsEvent
  timestamp: number
  metadata?: Record<string, unknown>
}

export function useAnalytics() {
  const trackEvent = (event: AnalyticsEvent, metadata?: Record<string, unknown>) => {
    const eventData: AnalyticsEventData = {
      event,
      timestamp: Date.now(),
      metadata
    }

    // Console log в dev mode
    if (import.meta.env.DEV) {
      console.log('[Analytics]', eventData)
    }

    // TODO: интеграция с Google Analytics / Plausible / PostHog
    // window.gtag?.('event', event, metadata)
    // window.plausible?.(event, { props: metadata })

    // Сохранение в localStorage для отладки
    try {
      const events = JSON.parse(localStorage.getItem('ft_analytics_events') || '[]')
      events.push(eventData)
      // Храним последние 100 событий
      if (events.length > 100) {
        events.shift()
      }
      localStorage.setItem('ft_analytics_events', JSON.stringify(events))
    } catch (error) {
      console.error('[Analytics] Failed to save event:', error)
    }
  }

  const clearEvents = () => {
    try {
      localStorage.removeItem('ft_analytics_events')
    } catch (error) {
      console.error('[Analytics] Failed to clear events:', error)
    }
  }

  const getEvents = (): AnalyticsEventData[] => {
    try {
      return JSON.parse(localStorage.getItem('ft_analytics_events') || '[]')
    } catch (error) {
      console.error('[Analytics] Failed to get events:', error)
      return []
    }
  }

  return {
    trackEvent,
    clearEvents,
    getEvents
  }
}

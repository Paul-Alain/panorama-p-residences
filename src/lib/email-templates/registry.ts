import type { ComponentType } from 'react'
import { template as reservationConfirmation } from './reservation-confirmation'
import { template as contactConfirmation } from './contact-confirmation'
import { template as adminReply } from './admin-reply'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

/**
 * Template registry — maps template names to their React Email components.
 * Import and register new templates here after creating them in this directory.
 */
export const TEMPLATES: Record<string, TemplateEntry> = {
  'reservation-confirmation': reservationConfirmation,
  'contact-confirmation': contactConfirmation,
  'admin-reply': adminReply,
}

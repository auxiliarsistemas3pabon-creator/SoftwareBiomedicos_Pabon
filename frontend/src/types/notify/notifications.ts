/**
 * Eventos que llegan por el canal WS `/ws/notifications/`.
 *
 * El backend usa el campo `type` como discriminador. Hoy hay un solo evento;
 * cuando se sumen más, se modela como union discriminada para que cada
 * consumidor reciba el tipo correcto al hacer narrowing.
 */
export interface ScheduleEmailSentEvent {
  type: "schedule_email_sent";
  schedule_id: number;
  equipment_asset_tag: string;
  /** ISO date (YYYY-MM-DD). */
  scheduled_date: string;
  branch_name: string;
  subject: string;
  /** ISO datetime. */
  sent_at: string;
}

export interface OverdueMaintenanceEvent {
  type: "overdue_maintenance";
  schedule_id: number;
  equipment_asset_tag: string;
  equipment_name: string;
  /** ISO date (YYYY-MM-DD). */
  scheduled_date: string;
  days_overdue: number;
  kind: string;
}

export type NotificationEvent = ScheduleEmailSentEvent | OverdueMaintenanceEvent;

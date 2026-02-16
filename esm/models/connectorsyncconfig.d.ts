import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
/**
 * Sync strategy: MANUAL (user-triggered), SCHEDULED (interval/cron), WEBHOOK (event-driven), REALTIME (WebSocket)
 */
export declare const SelectedStrategy: {
    readonly Manual: "MANUAL";
    readonly Scheduled: "SCHEDULED";
    readonly Webhook: "WEBHOOK";
    readonly Realtime: "REALTIME";
};
/**
 * Sync strategy: MANUAL (user-triggered), SCHEDULED (interval/cron), WEBHOOK (event-driven), REALTIME (WebSocket)
 */
export type SelectedStrategy = ClosedEnum<typeof SelectedStrategy>;
export declare const SelectedStrategy$zodSchema: z.ZodEnum<{
    MANUAL: "MANUAL";
    SCHEDULED: "SCHEDULED";
    WEBHOOK: "WEBHOOK";
    REALTIME: "REALTIME";
}>;
/**
 * Configuration for scheduled sync strategy
 */
export type ScheduledConfig = {
    intervalMinutes?: number | undefined;
    cronExpression?: string | undefined;
    timezone?: string | undefined;
};
export declare const ScheduledConfig$zodSchema: z.ZodType<ScheduledConfig>;
/**
 * Configuration for webhook-based sync
 */
export type WebhookConfig = {
    webhookUrl?: string | undefined;
    events?: Array<string> | undefined;
};
export declare const WebhookConfig$zodSchema: z.ZodType<WebhookConfig>;
/**
 * Synchronization configuration for a connector instance
 */
export type ConnectorSyncConfig = {
    selectedStrategy?: SelectedStrategy | undefined;
    scheduledConfig?: ScheduledConfig | undefined;
    webhookConfig?: WebhookConfig | undefined;
    values?: {
        [k: string]: any;
    } | undefined;
    customValues?: {
        [k: string]: any;
    } | undefined;
};
export declare const ConnectorSyncConfig$zodSchema: z.ZodType<ConnectorSyncConfig>;
//# sourceMappingURL=connectorsyncconfig.d.ts.map
import * as z from "zod";
/**
 * Aggregate statistics for the crawling job queue
 */
export type QueueStats = {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: number;
    repeatable: number;
    total: number;
};
export declare const QueueStats$zodSchema: z.ZodType<QueueStats>;
//# sourceMappingURL=queuestats.d.ts.map
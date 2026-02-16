import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
import { CrawlingJobData } from "./crawlingjobdata.js";
/**
 * Detailed progress object
 */
export type Progress = {
    percentage?: number | undefined;
    current?: number | undefined;
    total?: number | undefined;
};
export declare const Progress$zodSchema: z.ZodType<Progress>;
/**
 * Job progress information (can be number 0-100 or object with percentage/current/total)
 */
export type ProgressUnion = number | Progress;
export declare const ProgressUnion$zodSchema: z.ZodType<ProgressUnion>;
/**
 * Current state of the job in the queue:<br>
 *
 * @remarks
 * <ul>
 * <li><b>waiting</b>: Queued and waiting to be processed</li>
 * <li><b>active</b>: Currently being processed by a worker</li>
 * <li><b>completed</b>: Successfully finished</li>
 * <li><b>failed</b>: Failed after all retry attempts</li>
 * <li><b>delayed</b>: Scheduled to run at a future time</li>
 * <li><b>paused</b>: Manually paused by user</li>
 * <li><b>stuck</b>: Job is stuck (worker crashed mid-processing)</li>
 * </ul>
 */
export declare const State: {
    readonly Waiting: "waiting";
    readonly Active: "active";
    readonly Completed: "completed";
    readonly Failed: "failed";
    readonly Delayed: "delayed";
    readonly Paused: "paused";
    readonly Stuck: "stuck";
};
/**
 * Current state of the job in the queue:<br>
 *
 * @remarks
 * <ul>
 * <li><b>waiting</b>: Queued and waiting to be processed</li>
 * <li><b>active</b>: Currently being processed by a worker</li>
 * <li><b>completed</b>: Successfully finished</li>
 * <li><b>failed</b>: Failed after all retry attempts</li>
 * <li><b>delayed</b>: Scheduled to run at a future time</li>
 * <li><b>paused</b>: Manually paused by user</li>
 * <li><b>stuck</b>: Job is stuck (worker crashed mid-processing)</li>
 * </ul>
 */
export type State = ClosedEnum<typeof State>;
export declare const State$zodSchema: z.ZodEnum<{
    waiting: "waiting";
    active: "active";
    completed: "completed";
    failed: "failed";
    delayed: "delayed";
    paused: "paused";
    stuck: "stuck";
}>;
/**
 * Complete status information for a crawling job
 */
export type JobStatus = {
    id?: string | null | undefined;
    name: string;
    data: CrawlingJobData;
    progress?: number | Progress | undefined;
    delay?: number | null | undefined;
    timestamp: number;
    attemptsMade: number;
    finishedOn?: number | null | undefined;
    processedOn?: number | null | undefined;
    failedReason?: string | null | undefined;
    state: State;
};
export declare const JobStatus$zodSchema: z.ZodType<JobStatus>;
//# sourceMappingURL=jobstatus.d.ts.map
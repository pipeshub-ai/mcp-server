import * as z from "zod";
import { CustomScheduleConfig } from "./customscheduleconfig.js";
import { DailyScheduleConfig } from "./dailyscheduleconfig.js";
import { HourlyScheduleConfig } from "./hourlyscheduleconfig.js";
import { MonthlyScheduleConfig } from "./monthlyscheduleconfig.js";
import { OnceScheduleConfig } from "./oncescheduleconfig.js";
import { WeeklyScheduleConfig } from "./weeklyscheduleconfig.js";
/**
 * Schedule configuration for crawling jobs. The structure varies based on <code>scheduleType</code>.<br><br>
 *
 * @remarks
 * <b>Schedule Type Configurations:</b><br>
 * <ul>
 * <li><b>hourly:</b> <code>minute</code>, <code>interval</code> (optional)</li>
 * <li><b>daily:</b> <code>hour</code>, <code>minute</code></li>
 * <li><b>weekly:</b> <code>daysOfWeek</code>, <code>hour</code>, <code>minute</code></li>
 * <li><b>monthly:</b> <code>dayOfMonth</code>, <code>hour</code>, <code>minute</code></li>
 * <li><b>custom:</b> <code>cronExpression</code>, <code>description</code> (optional)</li>
 * <li><b>once:</b> <code>scheduledTime</code></li>
 * </ul>
 */
export type ScheduleConfig = (WeeklyScheduleConfig & {
    scheduleType: "weekly";
}) | (MonthlyScheduleConfig & {
    scheduleType: "monthly";
}) | (DailyScheduleConfig & {
    scheduleType: "daily";
}) | (HourlyScheduleConfig & {
    scheduleType: "hourly";
}) | (CustomScheduleConfig & {
    scheduleType: "custom";
}) | (OnceScheduleConfig & {
    scheduleType: "once";
});
export declare const ScheduleConfig$zodSchema: z.ZodType<ScheduleConfig>;
//# sourceMappingURL=scheduleconfig.d.ts.map
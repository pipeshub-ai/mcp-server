import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
export declare const OnceScheduleConfigScheduleType: {
    readonly Once: "once";
};
export type OnceScheduleConfigScheduleType = ClosedEnum<typeof OnceScheduleConfigScheduleType>;
export declare const OnceScheduleConfigScheduleType$zodSchema: z.ZodEnum<{
    once: "once";
}>;
/**
 * Run crawling job once at a specific future datetime
 */
export type OnceScheduleConfig = {
    scheduleType: OnceScheduleConfigScheduleType;
    isEnabled?: boolean | undefined;
    timezone?: string | undefined;
    scheduledTime: string;
};
export declare const OnceScheduleConfig$zodSchema: z.ZodType<OnceScheduleConfig>;
//# sourceMappingURL=oncescheduleconfig.d.ts.map
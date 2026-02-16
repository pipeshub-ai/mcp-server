import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
export declare const DailyScheduleConfigScheduleType: {
    readonly Daily: "daily";
};
export type DailyScheduleConfigScheduleType = ClosedEnum<typeof DailyScheduleConfigScheduleType>;
export declare const DailyScheduleConfigScheduleType$zodSchema: z.ZodEnum<{
    daily: "daily";
}>;
/**
 * Run crawling job once per day at a specified time
 */
export type DailyScheduleConfig = {
    scheduleType: DailyScheduleConfigScheduleType;
    isEnabled?: boolean | undefined;
    timezone?: string | undefined;
    hour: number;
    minute: number;
};
export declare const DailyScheduleConfig$zodSchema: z.ZodType<DailyScheduleConfig>;
//# sourceMappingURL=dailyscheduleconfig.d.ts.map
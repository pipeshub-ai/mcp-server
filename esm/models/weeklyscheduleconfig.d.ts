import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
export declare const WeeklyScheduleConfigScheduleType: {
    readonly Weekly: "weekly";
};
export type WeeklyScheduleConfigScheduleType = ClosedEnum<typeof WeeklyScheduleConfigScheduleType>;
export declare const WeeklyScheduleConfigScheduleType$zodSchema: z.ZodEnum<{
    weekly: "weekly";
}>;
/**
 * Run crawling job on specified days of the week
 */
export type WeeklyScheduleConfig = {
    scheduleType: WeeklyScheduleConfigScheduleType;
    isEnabled?: boolean | undefined;
    timezone?: string | undefined;
    daysOfWeek: Array<number>;
    hour: number;
    minute: number;
};
export declare const WeeklyScheduleConfig$zodSchema: z.ZodType<WeeklyScheduleConfig>;
//# sourceMappingURL=weeklyscheduleconfig.d.ts.map
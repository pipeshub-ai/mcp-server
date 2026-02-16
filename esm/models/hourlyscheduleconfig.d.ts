import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
export declare const HourlyScheduleConfigScheduleType: {
    readonly Hourly: "hourly";
};
export type HourlyScheduleConfigScheduleType = ClosedEnum<typeof HourlyScheduleConfigScheduleType>;
export declare const HourlyScheduleConfigScheduleType$zodSchema: z.ZodEnum<{
    hourly: "hourly";
}>;
/**
 * Run crawling job every X hours at a specified minute
 */
export type HourlyScheduleConfig = {
    scheduleType: HourlyScheduleConfigScheduleType;
    isEnabled?: boolean | undefined;
    timezone?: string | undefined;
    minute: number;
    interval?: number | undefined;
};
export declare const HourlyScheduleConfig$zodSchema: z.ZodType<HourlyScheduleConfig>;
//# sourceMappingURL=hourlyscheduleconfig.d.ts.map
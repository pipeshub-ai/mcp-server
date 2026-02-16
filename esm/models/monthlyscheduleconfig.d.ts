import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
export declare const MonthlyScheduleConfigScheduleType: {
    readonly Monthly: "monthly";
};
export type MonthlyScheduleConfigScheduleType = ClosedEnum<typeof MonthlyScheduleConfigScheduleType>;
export declare const MonthlyScheduleConfigScheduleType$zodSchema: z.ZodEnum<{
    monthly: "monthly";
}>;
/**
 * Run crawling job on a specified day of each month
 */
export type MonthlyScheduleConfig = {
    scheduleType: MonthlyScheduleConfigScheduleType;
    isEnabled?: boolean | undefined;
    timezone?: string | undefined;
    dayOfMonth: number;
    hour: number;
    minute: number;
};
export declare const MonthlyScheduleConfig$zodSchema: z.ZodType<MonthlyScheduleConfig>;
//# sourceMappingURL=monthlyscheduleconfig.d.ts.map
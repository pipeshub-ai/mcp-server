import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
export declare const CustomScheduleConfigScheduleType: {
    readonly Custom: "custom";
};
export type CustomScheduleConfigScheduleType = ClosedEnum<typeof CustomScheduleConfigScheduleType>;
export declare const CustomScheduleConfigScheduleType$zodSchema: z.ZodEnum<{
    custom: "custom";
}>;
/**
 * Run crawling job using a custom cron expression for complex schedules
 */
export type CustomScheduleConfig = {
    scheduleType: CustomScheduleConfigScheduleType;
    isEnabled?: boolean | undefined;
    timezone?: string | undefined;
    cronExpression: string;
    description?: string | undefined;
};
export declare const CustomScheduleConfig$zodSchema: z.ZodType<CustomScheduleConfig>;
//# sourceMappingURL=customscheduleconfig.d.ts.map
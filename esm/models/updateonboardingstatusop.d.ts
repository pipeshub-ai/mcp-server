import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
/**
 * Action to perform on the step
 */
export declare const Action: {
    readonly Complete: "complete";
    readonly Skip: "skip";
};
/**
 * Action to perform on the step
 */
export type Action = ClosedEnum<typeof Action>;
export declare const Action$zodSchema: z.ZodEnum<{
    complete: "complete";
    skip: "skip";
}>;
/**
 * Request payload
 */
export type UpdateOnboardingStatusRequest = {
    stepId: string;
    action: Action;
};
export declare const UpdateOnboardingStatusRequest$zodSchema: z.ZodType<UpdateOnboardingStatusRequest>;
/**
 * Onboarding status updated successfully
 */
export type UpdateOnboardingStatusResponse = {
    success?: boolean | undefined;
    message?: string | undefined;
    isOnboardingComplete?: boolean | undefined;
    nextStep?: string | undefined;
};
export declare const UpdateOnboardingStatusResponse$zodSchema: z.ZodType<UpdateOnboardingStatusResponse>;
//# sourceMappingURL=updateonboardingstatusop.d.ts.map
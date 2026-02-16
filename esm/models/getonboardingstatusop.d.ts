import * as z from "zod";
export type Step = {
    id?: string | undefined;
    name?: string | undefined;
    isCompleted?: boolean | undefined;
    isRequired?: boolean | undefined;
};
export declare const Step$zodSchema: z.ZodType<Step>;
export type GetOnboardingStatusData = {
    isCompleted?: boolean | undefined;
    currentStep?: string | undefined;
    completedSteps?: Array<string> | undefined;
    completionPercentage?: number | undefined;
    steps?: Array<Step> | undefined;
};
export declare const GetOnboardingStatusData$zodSchema: z.ZodType<GetOnboardingStatusData>;
/**
 * Onboarding status retrieved successfully
 */
export type GetOnboardingStatusResponse = {
    success?: boolean | undefined;
    data?: GetOnboardingStatusData | undefined;
};
export declare const GetOnboardingStatusResponse$zodSchema: z.ZodType<GetOnboardingStatusResponse>;
//# sourceMappingURL=getonboardingstatusop.d.ts.map
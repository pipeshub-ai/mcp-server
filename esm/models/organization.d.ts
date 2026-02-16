import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
/**
 * Type of account
 */
export declare const OrganizationAccountType: {
    readonly Individual: "individual";
    readonly Business: "business";
};
/**
 * Type of account
 */
export type OrganizationAccountType = ClosedEnum<typeof OrganizationAccountType>;
export declare const OrganizationAccountType$zodSchema: z.ZodEnum<{
    individual: "individual";
    business: "business";
}>;
/**
 * Onboarding status
 */
export declare const OnBoardingStatus: {
    readonly Configured: "configured";
    readonly NotConfigured: "notConfigured";
    readonly Skipped: "skipped";
};
/**
 * Onboarding status
 */
export type OnBoardingStatus = ClosedEnum<typeof OnBoardingStatus>;
export declare const OnBoardingStatus$zodSchema: z.ZodEnum<{
    configured: "configured";
    notConfigured: "notConfigured";
    skipped: "skipped";
}>;
export type Organization = {
    _id?: string | undefined;
    slug?: string | undefined;
    registeredName?: string | undefined;
    shortName?: string | undefined;
    domain: string;
    contactEmail: string;
    accountType: OrganizationAccountType;
    onBoardingStatus?: OnBoardingStatus | undefined;
    isDeleted?: boolean | undefined;
    createdAt?: number | undefined;
    updatedAt?: number | undefined;
};
export declare const Organization$zodSchema: z.ZodType<Organization>;
//# sourceMappingURL=organization.d.ts.map
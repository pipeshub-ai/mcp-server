import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
import { Organization } from "./organization.js";
import { User } from "./user.js";
/**
 * Type of organization account
 */
export declare const CreateOrganizationAccountType: {
    readonly Individual: "individual";
    readonly Business: "business";
};
/**
 * Type of organization account
 */
export type CreateOrganizationAccountType = ClosedEnum<typeof CreateOrganizationAccountType>;
export declare const CreateOrganizationAccountType$zodSchema: z.ZodEnum<{
    individual: "individual";
    business: "business";
}>;
/**
 * Request payload
 */
export type CreateOrganizationRequest = {
    accountType: CreateOrganizationAccountType;
    shortName?: string | undefined;
    registeredName?: string | undefined;
    contactEmail: string;
    adminFullName: string;
    password: string;
};
export declare const CreateOrganizationRequest$zodSchema: z.ZodType<CreateOrganizationRequest>;
export type CreateOrganizationData = {
    organization?: Organization | undefined;
    adminUser?: User | undefined;
    accessToken?: string | undefined;
};
export declare const CreateOrganizationData$zodSchema: z.ZodType<CreateOrganizationData>;
/**
 * Organization created successfully
 */
export type CreateOrganizationResponse = {
    success?: boolean | undefined;
    message?: string | undefined;
    data?: CreateOrganizationData | undefined;
};
export declare const CreateOrganizationResponse$zodSchema: z.ZodType<CreateOrganizationResponse>;
//# sourceMappingURL=createorganizationop.d.ts.map
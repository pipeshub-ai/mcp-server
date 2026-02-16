import * as z from "zod";
export type Logo = {
    fileName: string;
    content: Uint8Array | string;
};
export declare const Logo$zodSchema: z.ZodType<Logo>;
/**
 * Request payload
 */
export type UploadOrganizationLogoRequest = {
    logo: Logo | Blob;
};
export declare const UploadOrganizationLogoRequest$zodSchema: z.ZodType<UploadOrganizationLogoRequest>;
/**
 * Logo uploaded successfully
 */
export type UploadOrganizationLogoResponse = {
    success?: boolean | undefined;
    logoUrl?: string | undefined;
};
export declare const UploadOrganizationLogoResponse$zodSchema: z.ZodType<UploadOrganizationLogoResponse>;
//# sourceMappingURL=uploadorganizationlogoop.d.ts.map
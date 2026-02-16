import * as z from "zod";
export declare const ConnectorGetSignedUrlOpServerList: readonly ["http://localhost:8088"];
export type ConnectorGetSignedUrlSecurity = {
    scopedToken: string;
};
export declare const ConnectorGetSignedUrlSecurity$zodSchema: z.ZodType<ConnectorGetSignedUrlSecurity>;
export type ConnectorGetSignedUrlRequest = {
    org_id: string;
    user_id: string;
    connector: string;
    record_id: string;
};
export declare const ConnectorGetSignedUrlRequest$zodSchema: z.ZodType<ConnectorGetSignedUrlRequest>;
/**
 * Signed URL generated
 */
export type ConnectorGetSignedUrlResponse = {
    signedUrl?: string | undefined;
    expiresAt?: number | undefined;
};
export declare const ConnectorGetSignedUrlResponse$zodSchema: z.ZodType<ConnectorGetSignedUrlResponse>;
//# sourceMappingURL=connectorgetsignedurlop.d.ts.map
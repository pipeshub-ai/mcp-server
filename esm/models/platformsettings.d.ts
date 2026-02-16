import * as z from "zod";
/**
 * Platform-wide configuration settings for file uploads and feature toggles
 */
export type PlatformSettings = {
    fileUploadMaxSizeBytes: number;
    featureFlags: {
        [k: string]: boolean;
    };
    updatedAt?: string | undefined;
};
export declare const PlatformSettings$zodSchema: z.ZodType<PlatformSettings>;
//# sourceMappingURL=platformsettings.d.ts.map
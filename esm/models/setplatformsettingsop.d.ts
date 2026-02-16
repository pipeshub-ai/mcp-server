import * as z from "zod";
/**
 * Request body for Update platform settings
 */
export type SetPlatformSettingsRequest = {
    fileUploadMaxSizeBytes: number;
    featureFlags: {
        [k: string]: boolean;
    };
};
export declare const SetPlatformSettingsRequest$zodSchema: z.ZodType<SetPlatformSettingsRequest>;
//# sourceMappingURL=setplatformsettingsop.d.ts.map
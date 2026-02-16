import * as z from "zod";
/**
 * Platform feature flag definition
 */
export type FeatureFlag = {
    key?: string | undefined;
    label?: string | undefined;
    description?: string | undefined;
    defaultEnabled?: boolean | undefined;
};
export declare const FeatureFlag$zodSchema: z.ZodType<FeatureFlag>;
//# sourceMappingURL=featureflag.d.ts.map
import * as z from "zod";
import { FeatureFlag } from "./featureflag.js";
/**
 * Feature flags retrieved
 */
export type GetAvailableFeatureFlagsResponse = {
    featureFlags?: Array<FeatureFlag> | undefined;
};
export declare const GetAvailableFeatureFlagsResponse$zodSchema: z.ZodType<GetAvailableFeatureFlagsResponse>;
//# sourceMappingURL=getavailablefeatureflagsop.d.ts.map
import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
/**
 * Storage type identifier
 */
export declare const CreateLocalStorageConfigStorageType: {
    readonly Local: "local";
};
/**
 * Storage type identifier
 */
export type CreateLocalStorageConfigStorageType = ClosedEnum<typeof CreateLocalStorageConfigStorageType>;
export declare const CreateLocalStorageConfigStorageType$zodSchema: z.ZodEnum<{
    local: "local";
}>;
/**
 * Request body for Configure Local Storage
 */
export type CreateLocalStorageConfigRequest = {
    storageType: CreateLocalStorageConfigStorageType;
    mountName?: string | undefined;
    baseUrl?: string | undefined;
};
export declare const CreateLocalStorageConfigRequest$zodSchema: z.ZodType<CreateLocalStorageConfigRequest>;
//# sourceMappingURL=createlocalstorageconfigop.d.ts.map
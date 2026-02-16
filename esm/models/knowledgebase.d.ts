import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
/**
 * User's role in this knowledge base
 */
export declare const UserRoleEnum: {
    readonly Owner: "OWNER";
    readonly Organizer: "ORGANIZER";
    readonly Fileorganizer: "FILEORGANIZER";
    readonly Writer: "WRITER";
    readonly Commenter: "COMMENTER";
    readonly Reader: "READER";
};
/**
 * User's role in this knowledge base
 */
export type UserRoleEnum = ClosedEnum<typeof UserRoleEnum>;
export declare const UserRoleEnum$zodSchema: z.ZodEnum<{
    OWNER: "OWNER";
    ORGANIZER: "ORGANIZER";
    FILEORGANIZER: "FILEORGANIZER";
    WRITER: "WRITER";
    COMMENTER: "COMMENTER";
    READER: "READER";
}>;
export type KnowledgeBase = {
    _key?: string | undefined;
    name: string;
    orgId: string;
    createdAtTimestamp?: number | undefined;
    updatedAtTimestamp?: number | undefined;
    userRole?: UserRoleEnum | undefined;
    isDeleted?: boolean | undefined;
};
export declare const KnowledgeBase$zodSchema: z.ZodType<KnowledgeBase>;
//# sourceMappingURL=knowledgebase.d.ts.map
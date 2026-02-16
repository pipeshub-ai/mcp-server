import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
/**
 * Type of token
 */
export declare const TokenType: {
    readonly Access: "access";
    readonly Refresh: "refresh";
};
/**
 * Type of token
 */
export type TokenType = ClosedEnum<typeof TokenType>;
export declare const TokenType$zodSchema: z.ZodEnum<{
    access: "access";
    refresh: "refresh";
}>;
/**
 * Information about an issued token
 */
export type OAuthTokenListItem = {
    id?: string | undefined;
    tokenType?: TokenType | undefined;
    userId?: string | undefined;
    scopes?: Array<string> | undefined;
    createdAt?: string | undefined;
    expiresAt?: string | undefined;
    isRevoked?: boolean | undefined;
};
export declare const OAuthTokenListItem$zodSchema: z.ZodType<OAuthTokenListItem>;
//# sourceMappingURL=oauthtokenlistitem.d.ts.map
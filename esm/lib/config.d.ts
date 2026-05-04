import { Security } from "../models/security.js";
import { HTTPClient } from "./http.js";
import { Logger } from "./logger.js";
import { RetryConfig } from "./retries.js";
/**
 * Contains the list of servers available to the SDK
 */
export declare const ServerList: readonly ["https://{instance_url}/api/v1", "https://{instance_url}"];
export type SDKOptions = {
    /**
     * The security details required to authenticate the SDK
     */
    security?: Security | (() => Promise<Security>) | undefined;
    httpClient?: HTTPClient;
    /**
     * Allows overriding the default server used by the SDK
     */
    serverIdx?: number | undefined;
    /**
     * Sets the instance_url variable for url substitution
     */
    instance_url?: string | undefined;
    /**
     * Allows overriding the default server URL used by the SDK
     */
    serverURL?: string | undefined;
    /**
     * Allows overriding the default user agent used by the SDK
     */
    userAgent?: string | undefined;
    /**
     * Allows overriding the default retry config used by the SDK
     */
    retryConfig?: RetryConfig;
    timeoutMs?: number;
    debugLogger?: Logger | undefined;
};
export declare function serverURLFromOptions(options: SDKOptions): URL | null;
export declare const SDK_METADATA: {
    readonly language: "typescript";
    readonly openapiDocVersion: "1.0.0";
    readonly sdkVersion: "0.0.4";
    readonly genVersion: "2.846.1";
    readonly userAgent: "speakeasy-sdk/mcp-typescript 0.0.4 2.846.1 1.0.0 mcp";
};
//# sourceMappingURL=config.d.ts.map
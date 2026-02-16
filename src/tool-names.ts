// Auto-generated at build time
export const toolNames: Array<{ name: string; description: string }>= [
  {
    "name": "user-account-init-auth",
    "description": "Initialize authentication session\n\nInitialize an authentication session for a user by email address.\nThis is the first step in the multi-step authentication flow.\n<br><br>\n<b>Flow:</b><br>\n1. Call this endpoint with the user's email<br>\n2. Receive a session token in the <code>x-session-token</code> response header<br>\n3. Use the session token in subsequent <code>/authenticate</code> calls<br>\n4. The response includes <code>allowedMethods</code> for the first authentication step\n<br><br>\n<b>Session Token:</b><br>\n- Stored in response header <code>x-session-token</code><br>\n- Required for all subsequent authentication requests<br>\n- Expires after a configured timeout period\n<br><br>\n<b>Multi-Factor Authentication:</b><br>\nIf the organization has MFA configured, you'll need to complete multiple\nauthentication steps. Each step completion returns the next step's allowed methods.\n"
  },
  {
    "name": "user-account-authenticate",
    "description": "Authenticate user with credentials\n\nAuthenticate a user using the specified method and credentials.\nRequires a valid session token from <code>/initAuth</code>.\n<br><br>\n<b>Credential Formats by Method:</b><br>\n- <code>password</code>: <code>{ \"credentials\": { \"password\": \"your-password\" } }</code><br>\n- <code>otp</code>: <code>{ \"credentials\": { \"otp\": \"123456\" } }</code> (6-digit code, valid for 10 minutes)<br>\n- <code>google</code>: <code>{ \"credentials\": \"google-id-token-string\" }</code><br>\n- <code>microsoft</code>: <code>{ \"credentials\": { \"accessToken\": \"...\", \"idToken\": \"...\" } }</code><br>\n- <code>azureAd</code>: <code>{ \"credentials\": { \"accessToken\": \"...\", \"idToken\": \"...\" } }</code><br>\n- <code>oauth</code>: <code>{ \"credentials\": { \"accessToken\": \"...\", \"idToken\": \"...\" } }</code><br>\n- <code>samlSso</code>: Handled via redirect flow (use <code>/saml/signIn</code> instead)\n<br><br>\n<b>Multi-Step Response:</b><br>\nIf organization uses MFA, successful authentication returns:<br>\n- <code>status: \"success\"</code> with <code>nextStep</code> and <code>allowedMethods</code> for next step\n<br><br>\n<b>Fully Authenticated Response:</b><br>\nAfter completing all steps:<br>\n- <code>message: \"Fully authenticated\"</code> with <code>accessToken</code> (1hr) and <code>refreshToken</code> (7d)\n<br><br>\n<b>Security:</b><br>\n- Account locks after 5 consecutive failed attempts<br>\n- CAPTCHA may be required if enabled (pass <code>cf-turnstile-response</code>)\n"
  },
  {
    "name": "user-account-generate-otp",
    "description": "Generate and send OTP for login\n\nGenerate and send a 6-digit one-time password (OTP) to the user's email.\nUse this endpoint before authenticating with the <code>otp</code> method.\n<br><br>\n<b>OTP Details:</b><br>\n- 6 digits numeric code<br>\n- Valid for <b>10 minutes</b> after generation<br>\n- Sent to user's registered email address\n<br><br>\n<b>Rate Limiting:</b><br>\n- Multiple OTP requests may be rate-limited<br>\n- Wait for the current OTP to expire before requesting a new one\n<br><br>\n<b>CAPTCHA:</b><br>\nIf Cloudflare Turnstile is enabled, include <code>cf-turnstile-response</code> in the request body.\n"
  },
  {
    "name": "user-account-forgot-password",
    "description": "Request password reset email\n\nSend a password reset link to the user's email.\nThe link contains a time-limited token that can be used to reset the password.\n<br><br>\n<b>Note:</b> This endpoint always returns 200 even if the email doesn't exist (to prevent email enumeration).\n"
  },
  {
    "name": "user-account-logout",
    "description": "Logout current session\n\nLog out the current user session and invalidate tokens.\n<br><br>\n<b>Effects:</b><br>\n- Invalidates the current access token<br>\n- Clears server-side session data<br>\n- Client should also clear stored tokens locally\n<br><br>\n<b>Note:</b> This endpoint requires the access token, not the refresh token.\n"
  },
  {
    "name": "user-accounts-reset-password",
    "description": "Reset password (authenticated user)\n\nReset password for an authenticated user. Requires the current password for verification.\n<br><br>\n<b>Password Requirements:</b><br>\n- Minimum 8 characters<br>\n- At least 1 uppercase letter (A-Z)<br>\n- At least 1 lowercase letter (a-z)<br>\n- At least 1 number (0-9)<br>\n- At least 1 special character (#?!@$%^&*-)\n<br><br>\n<b>Security Notes:</b><br>\n- A new access token is returned (old tokens are invalidated)<br>\n- CAPTCHA may be required if enabled (pass <code>cf-turnstile-response</code>)\n"
  },
  {
    "name": "oauth-exchange-code",
    "description": "Exchange OAuth authorization code for tokens\n\nExchange an OAuth authorization code for access and ID tokens.\nUsed after the OAuth authorization flow redirects back to the application.\n<br><br>\n<b>Supported Providers:</b><br>\n- Generic OAuth 2.0 providers configured in org settings\n<br><br>\n<b>Flow:</b><br>\n1. User is redirected to OAuth provider's authorization URL<br>\n2. User authorizes and is redirected back with a code<br>\n3. This endpoint exchanges the code for tokens<br>\n4. Tokens can then be used with the <code>/userAccount/authenticate</code> endpoint\n"
  },
  {
    "name": "oauth-provider-authorize",
    "description": "Initiate OAuth authorization flow\n\nOAuth 2.0 Authorization Endpoint (RFC 6749 Section 4.1.1).\n<br><br>\nInitiates the authorization code flow. Users are redirected here by OAuth clients\nto authorize access to their account.\n<br><br>\n<b>Flow:</b><br>\n1. Client redirects user to this endpoint with required parameters<br>\n2. If not logged in, user is redirected to PipesHub login<br>\n3. User sees consent page with requested scopes<br>\n4. User grants or denies consent<br>\n5. User is redirected back to client with authorization code\n<br><br>\n<b>PKCE Support (RFC 7636):</b><br>\n- Required for public clients (SPA, mobile apps)<br>\n- Recommended for confidential clients<br>\n- Use S256 method (SHA256 hash of code_verifier)\n<br><br>\n<b>Security:</b><br>\n- Always use HTTPS in production<br>\n- State parameter provides CSRF protection<br>\n- Redirect URI must match registered URIs exactly\n"
  },
  {
    "name": "oauth-provider-authorize-consent",
    "description": "Submit authorization consent\n\nSubmit user's consent decision for OAuth authorization.\n<br><br>\nCalled after user reviews the consent page and makes a decision.\nThis endpoint generates an authorization code if consent is granted.\n<br><br>\n<b>Responses:</b><br>\n- Consent granted: Redirects to client with authorization code<br>\n- Consent denied: Redirects to client with `access_denied` error\n"
  },
  {
    "name": "oauth-provider-exchange-token",
    "description": "Exchange authorization code for tokens\n\nOAuth 2.0 Token Endpoint (RFC 6749 Section 4.1.3).\n<br><br>\nExchanges an authorization code, client credentials, or refresh token for access tokens.\n<br><br>\n<b>Grant Types:</b><br>\n- `authorization_code`: Exchange auth code for tokens (user-based)<br>\n- `client_credentials`: Get tokens for machine-to-machine auth<br>\n- `refresh_token`: Get new access token using refresh token\n<br><br>\n<b>Client Authentication:</b><br>\nCan be provided via:<br>\n- HTTP Basic auth: `Authorization: Basic base64(client_id:client_secret)`<br>\n- Request body: `client_id` and `client_secret` parameters\n<br><br>\n<b>PKCE Verification:</b><br>\nIf authorization used PKCE, the `code_verifier` must be provided and will be\nverified against the stored code challenge.\n"
  },
  {
    "name": "oauth-provider-revoke",
    "description": "Revoke an access or refresh token\n\nOAuth 2.0 Token Revocation Endpoint (RFC 7009).\n<br><br>\nRevokes an access token or refresh token, preventing further use.\nRevoking a refresh token also invalidates associated access tokens.\n<br><br>\n<b>Use Cases:</b><br>\n- User logs out of third-party app<br>\n- User revokes app access from account settings<br>\n- Security incident response\n<br><br>\n<b>Note:</b> Returns 200 OK even if token was already revoked or invalid\n(per RFC 7009, to prevent token enumeration).\n"
  },
  {
    "name": "oauth-provider-introspect",
    "description": "Introspect a token\n\nOAuth 2.0 Token Introspection Endpoint (RFC 7662).\n<br><br>\nCheck if a token is active and retrieve its metadata.\n<br><br>\n<b>Use Cases:</b><br>\n- Resource servers validating tokens<br>\n- Debugging token issues<br>\n- Checking token scopes before processing requests\n<br><br>\n<b>Response:</b><br>\n- Active token: Returns `active: true` with token metadata<br>\n- Invalid/expired/revoked token: Returns only `active: false`\n"
  },
  {
    "name": "openid-connect-userinfo",
    "description": "Get authenticated user information\n\nOpenID Connect UserInfo Endpoint.\n<br><br>\nReturns claims about the authenticated user. Requires a valid access token\nwith the `openid` scope.\n<br><br>\n<b>Available Claims:</b><br>\n- `sub` - Subject identifier (user ID)<br>\n- `name`, `given_name`, `family_name` - Name claims (with `profile` scope)<br>\n- `email`, `email_verified` - Email claims (with `email` scope)\n<br><br>\n<b>Authentication:</b><br>\nPass the access token as a Bearer token: `Authorization: Bearer {access_token}`\n"
  },
  {
    "name": "open-ID-connect-discovery",
    "description": "OpenID Connect Discovery\n\nOpenID Connect Discovery Endpoint (RFC 8414).\n<br><br>\nReturns metadata about the OAuth/OIDC authorization server including\nendpoint URLs, supported features, and capabilities.\n<br><br>\n<b>Use Cases:</b><br>\n- Automatic client configuration<br>\n- Discovering supported features<br>\n- Getting endpoint URLs without hardcoding\n<br><br>\n<b>Note:</b> This endpoint does not require authentication.\n"
  },
  {
    "name": "open-ID-connect-get-jwks",
    "description": "JSON Web Key Set\n\nJSON Web Key Set Endpoint (RFC 7517).\n<br><br>\nReturns the public keys used to verify JWT signatures for ID tokens\nand access tokens.\n<br><br>\n<b>Use Cases:</b><br>\n- Verifying ID token signatures<br>\n- Verifying access token signatures (if JWT-based)\n<br><br>\n<b>Note:</b><br>\n- For HS256 (symmetric) signing, this returns empty keys<br>\n- For RS256 (asymmetric) signing, returns public RSA keys<br>\n- Keys should be cached with appropriate TTL\n"
  },
  {
    "name": "oauth-apps-list",
    "description": "List OAuth apps\n\nList all OAuth apps registered for the organization.\n<br><br>\nReturns a paginated list of apps with their configuration (excluding secrets).\n<br><br>\n<b>Filters:</b><br>\n- `status` - Filter by app status (active, suspended, revoked)<br>\n- `search` - Search by app name\n"
  },
  {
    "name": "oauth-apps-create",
    "description": "Create OAuth app\n\nCreate a new OAuth app for the organization.\n<br><br>\n<b>Important:</b> The client secret is only returned once during creation.\nStore it securely - it cannot be retrieved later. If lost, you'll need to\nregenerate it.\n<br><br>\n<b>Admin Only:</b> Requires admin privileges.\n<br><br>\n<b>Rate Limited:</b> 10 requests per minute.\n"
  },
  {
    "name": "oauth-apps-list-scopes",
    "description": "List available scopes\n\nList all available OAuth scopes that can be requested by apps.\n<br><br>\nReturns scope names, descriptions, and categories for display\nin app configuration UI.\n"
  },
  {
    "name": "oauth-apps-get",
    "description": "Get OAuth app details\n\nGet details of a specific OAuth app.\n<br><br>\nReturns app configuration without the client secret.\n"
  },
  {
    "name": "oauth-apps-update",
    "description": "Update OAuth app\n\nUpdate an OAuth app's configuration.\n<br><br>\n<b>Admin Only:</b> Requires admin privileges.\n<br><br>\n<b>Rate Limited:</b> 10 requests per minute.\n<br><br>\n<b>Note:</b> To regenerate the client secret, use the\n`/oauth-clients/{appId}/regenerate-secret` endpoint.\n"
  },
  {
    "name": "oauth-apps-delete",
    "description": "Delete OAuth app\n\nDelete (soft delete) an OAuth app.\n<br><br>\nThis marks the app as deleted and revokes all its tokens.\nThe app cannot be restored after deletion.\n<br><br>\n<b>Admin Only:</b> Requires admin privileges.\n<br><br>\n<b>Rate Limited:</b> 10 requests per minute.\n"
  },
  {
    "name": "oauth-apps-regenerate-secret",
    "description": "Regenerate client secret\n\nRegenerate the client secret for an OAuth app.\n<br><br>\nThe old secret is immediately invalidated. Any clients using the old\nsecret will fail to authenticate until updated with the new secret.\n<br><br>\n<b>Important:</b> The new secret is only returned once. Store it securely.\n<br><br>\n<b>Admin Only:</b> Requires admin privileges.\n<br><br>\n<b>Rate Limited:</b> 10 requests per minute.\n"
  },
  {
    "name": "oauth-apps-suspend",
    "description": "Suspend OAuth app\n\nSuspend an OAuth app, preventing it from authenticating or issuing tokens.\n<br><br>\nExisting tokens remain valid until they expire, but no new tokens can\nbe obtained. Use this for temporary access suspension.\n<br><br>\n<b>Admin Only:</b> Requires admin privileges.\n<br><br>\n<b>Rate Limited:</b> 10 requests per minute.\n"
  },
  {
    "name": "oauth-apps-activate",
    "description": "Activate suspended OAuth app\n\nReactivate a suspended OAuth app, allowing it to authenticate and issue tokens again.\n<br><br>\n<b>Admin Only:</b> Requires admin privileges.\n<br><br>\n<b>Rate Limited:</b> 10 requests per minute.\n"
  },
  {
    "name": "oauth-apps-list-tokens",
    "description": "List app tokens\n\nList all active tokens issued to an OAuth app.\n<br><br>\nUseful for monitoring app usage and identifying tokens to revoke.\n<br><br>\n<b>Admin Only:</b> Requires admin privileges.\n"
  },
  {
    "name": "oauth-apps-revoke-all-tokens",
    "description": "Revoke all app tokens\n\nRevoke all tokens (access and refresh) issued to an OAuth app.\n<br><br>\nUse this for emergency access removal or when rotating credentials.\n<br><br>\n<b>Admin Only:</b> Requires admin privileges.\n<br><br>\n<b>Rate Limited:</b> 10 requests per minute.\n"
  },
  {
    "name": "organization-auth-config-create",
    "description": "Create organization authentication configuration\n\nCreate initial organization authentication configuration during onboarding.\nThis endpoint creates a new organization with admin user and default auth settings.\n<br><br>\n<b>Note:</b> This is typically called during the initial setup process.\n"
  },
  {
    "name": "organization-auth-config-get-auth-methods",
    "description": "Get organization authentication methods\n\nRetrieve the configured authentication methods for the organization.\n<br><br>\n<b>Response Structure:</b><br>\nReturns an array of authentication steps, each containing:<br>\n- <code>order</code>: Step number (1-3)<br>\n- <code>allowedMethods</code>: Array of methods allowed for that step\n<br><br>\n<b>Example Response:</b><br>\n<pre>\n{\n  \"authMethods\": [\n    { \"order\": 1, \"allowedMethods\": [{ \"type\": \"password\" }, { \"type\": \"google\" }] },\n    { \"order\": 2, \"allowedMethods\": [{ \"type\": \"otp\" }] }\n  ]\n}\n</pre>\n<br>\n<b>Admin Access Required:</b> Only organization admins can view auth configuration.\n"
  },
  {
    "name": "organization-auth-config-update-auth-method",
    "description": "Update organization authentication methods\n\nUpdate the authentication methods configuration for an organization.\nThis allows admins to configure single or multi-factor authentication.\n<br><br>\n<b>Validation Rules:</b><br>\n- Minimum 1 step, maximum 3 steps<br>\n- Each step must have a unique order (1, 2, or 3)<br>\n- No duplicate methods within the same step<br>\n- No method can appear in multiple steps<br>\n- Each step must have at least one allowed method\n<br><br>\n<b>Available Methods:</b><br>\n- <code>password</code>: Email/password authentication<br>\n- <code>otp</code>: One-time password via email<br>\n- <code>google</code>: Google OAuth 2.0<br>\n- <code>microsoft</code>: Microsoft OAuth 2.0<br>\n- <code>azureAd</code>: Azure Active Directory<br>\n- <code>samlSso</code>: SAML 2.0 Single Sign-On<br>\n- <code>oauth</code>: Generic OAuth 2.0 provider\n<br><br>\n<b>Example - Single Factor (Password or Google):</b><br>\n<pre>\n{\n  \"authMethods\": [\n    { \"order\": 1, \"allowedMethods\": [{ \"type\": \"password\" }, { \"type\": \"google\" }] }\n  ]\n}\n</pre>\n<br>\n<b>Example - Two Factor (Password + OTP):</b><br>\n<pre>\n{\n  \"authMethods\": [\n    { \"order\": 1, \"allowedMethods\": [{ \"type\": \"password\" }] },\n    { \"order\": 2, \"allowedMethods\": [{ \"type\": \"otp\" }] }\n  ]\n}\n</pre>\n<br>\n<b>Admin Access Required:</b> Only organization admins can update auth configuration.\n"
  },
  {
    "name": "saml-sign-in",
    "description": "Initiate SAML sign-in flow\n\nInitiate SAML Single Sign-On authentication by redirecting to the Identity Provider (IDP).\n<br><br>\n<b>Usage:</b><br>\n1. Call <code>/userAccount/initAuth</code> to get a session token<br>\n2. If <code>samlSso</code> is in the allowed methods, redirect the user to this endpoint<br>\n3. User authenticates with their IDP<br>\n4. IDP redirects back to <code>/saml/signIn/callback</code> with SAML response<br>\n5. Callback completes authentication and returns tokens\n<br><br>\n<b>Note:</b> This is a browser redirect endpoint, not a typical API call.\nThe user's browser should be redirected to this URL.\n<br><br>\n<b>Prerequisites:</b><br>\n- Organization must have SAML SSO configured via <code>/saml/updateAppConfig</code><br>\n- User must belong to an organization with SAML enabled\n"
  },
  {
    "name": "saml-callback",
    "description": "SAML authentication callback\n\nHandle the callback from SAML Identity Provider after user authentication.\nThis endpoint processes the SAML response and completes the authentication flow.\n<br><br>\n<b>Note:</b> This endpoint is called by the IDP, not directly by the client.\nThe IDP posts the SAML response to this URL after user authentication.\n<br><br>\n<b>Flow:</b><br>\n1. IDP posts SAMLResponse and RelayState<br>\n2. Server validates SAML assertion signature<br>\n3. Server extracts user identity from assertion<br>\n4. Server completes the authentication step<br>\n5. Redirects to frontend with success/error status\n<br><br>\n<b>RelayState:</b> Contains the session token to resume the authentication flow.\n"
  },
  {
    "name": "users-list",
    "description": "Get all users\n\nRetrieve a paginated list of all users in the organization.<br><br>\n<b>Overview:</b><br>\nThis endpoint returns all active users in your organization. It's the primary endpoint for listing and displaying users in admin dashboards, user directories, and selection interfaces.<br><br>\n<b>Response Data:</b><br>\n<ul>\n<li>User profile information (name, email, designation)</li>\n<li>Account status (active, pending invitation, disabled)</li>\n<li>Login history (hasLoggedIn flag)</li>\n<li>Timestamps (createdAt, updatedAt)</li>\n</ul>\n<b>Privacy Controls:</b><br>\n<ul>\n<li>Email addresses may be masked based on organization settings</li>\n<li>Sensitive fields (password, tokens) are never exposed</li>\n<li>Deleted users are excluded from results</li>\n</ul>\n<b>Performance Notes:</b><br>\n<ul>\n<li>Results are cached for improved performance</li>\n<li>For large organizations, consider using pagination</li>\n<li>Use <code>/users/by-ids</code> for fetching specific users</li>\n</ul>\n"
  },
  {
    "name": "users-create",
    "description": "Create a new user\n\nCreate a new user account in the organization and optionally send an invitation email.<br><br>\n<b>Overview:</b><br>\nThis endpoint creates a new user account. The user will be added to the organization but won't have a password set until they complete the invitation flow or are assigned one by an admin.<br><br>\n<b>Invitation Flow:</b><br>\n<ol>\n<li>Admin creates user with this endpoint</li>\n<li>System generates invitation token</li>\n<li>User receives invitation email (if sendInvite is true)</li>\n<li>User clicks link and sets their password</li>\n<li>User can now log in normally</li>\n</ol>\n<b>Validation Rules:</b><br>\n<ul>\n<li><code>fullName</code>: Required, 1-100 characters</li>\n<li><code>email</code>: Required, valid email format, must be unique in org</li>\n<li><code>mobile</code>: Optional, format: +[country][number] (10-15 digits)</li>\n<li><code>designation</code>: Optional, job title or role</li>\n</ul>\n<b>Side Effects:</b><br>\n<ul>\n<li>User is automatically added to the \"everyone\" group</li>\n<li>Invitation email sent if <code>sendInvite: true</code></li>\n<li>User creation event published to event bus</li>\n<li>Audit log entry created</li>\n</ul>\n<b>Authorization:</b><br>\nOnly organization administrators can create new users.\n"
  },
  {
    "name": "users-get-by-id",
    "description": "Get user by ID\n\nRetrieve detailed information about a specific user by their unique identifier.<br><br>\n<b>Overview:</b><br>\nThis endpoint returns the complete user profile for the specified user ID. Use this to display user details in profiles, settings pages, or when you need full user information.<br><br>\n<b>Response Data:</b><br>\n<ul>\n<li>Basic info: fullName, firstName, lastName, email</li>\n<li>Contact: mobile, address</li>\n<li>Professional: designation</li>\n<li>Status: hasLoggedIn, isDeleted, accountStatus</li>\n<li>Metadata: createdAt, updatedAt, createdBy</li>\n</ul>\n<b>Privacy Notes:</b><br>\n<ul>\n<li>Email may be masked for non-admin users based on org settings</li>\n<li>Password and sensitive tokens are never returned</li>\n<li>Display picture URL returned if set</li>\n</ul>\n<b>Related Endpoints:</b><br>\n<ul>\n<li><code>GET /users/{id}/email</code> - Get just the email (admin only)</li>\n<li><code>GET /users/fetch/with-groups</code> - Get user with group memberships</li>\n</ul>\n"
  },
  {
    "name": "users-update",
    "description": "Update user\n\nUpdate user profile information. Users can update their own profile, admins can update any user.<br><br>\n<b>Overview:</b><br>\nThis endpoint allows updating user profile fields. The scope of allowed updates depends on the requester's role and relationship to the user being updated.<br><br>\n<b>Authorization Matrix:</b><br>\n<ul>\n<li><b>Self-update:</b> Users can update their own fullName, mobile, designation, address</li>\n<li><b>Admin-update:</b> Admins can update any field for any user</li>\n<li><b>Email changes:</b> Require admin privileges and trigger re-verification</li>\n</ul>\n<b>Updatable Fields:</b><br>\n<ul>\n<li><code>fullName</code>: Display name (also updates firstName/lastName if parsed)</li>\n<li><code>firstName</code>: First name only</li>\n<li><code>lastName</code>: Last name only</li>\n<li><code>email</code>: Email address (admin only, triggers verification)</li>\n<li><code>mobile</code>: Phone number with country code</li>\n<li><code>designation</code>: Job title</li>\n<li><code>address</code>: Full address object</li>\n</ul>\n<b>Validation Rules:</b><br>\n<ul>\n<li>Email must be unique within the organization</li>\n<li>Mobile must match pattern: +[country][number]</li>\n<li>Name fields: 1-100 characters</li>\n</ul>\n<b>Side Effects:</b><br>\n<ul>\n<li>User update event published to event bus</li>\n<li>Audit log entry created for admin updates</li>\n<li>Email change triggers verification email</li>\n</ul>\n"
  },
  {
    "name": "users-delete",
    "description": "Delete user\n\nSoft delete a user from the organization. The user account is deactivated but data is retained for audit purposes.<br><br>\n<b>Overview:</b><br>\nThis endpoint performs a soft delete on a user account. The user is marked as deleted and can no longer access the system, but their data is retained for compliance and audit purposes.<br><br>\n<b>What Happens on Delete:</b><br>\n<ol>\n<li>User's <code>isDeleted</code> flag is set to true</li>\n<li>User's password is cleared</li>\n<li>User is removed from all user groups</li>\n<li>User's active sessions are invalidated</li>\n<li>User deletion event is published</li>\n</ol>\n<b>Restrictions:</b><br>\n<ul>\n<li>Cannot delete organization admins (demote first)</li>\n<li>Cannot delete the organization owner</li>\n<li>Cannot delete yourself through this endpoint</li>\n<li>Cannot delete already-deleted users</li>\n</ul>\n<b>Data Retention:</b><br>\n<ul>\n<li>User profile data is retained (soft delete)</li>\n<li>User's documents and content remain with updated ownership</li>\n<li>Audit logs are preserved</li>\n<li>Data can be permanently purged by super admin if required</li>\n</ul>\n<b>Recovery:</b><br>\nDeleted users can be restored by organization admins within a configurable retention period.\n"
  },
  {
    "name": "users-get-with-groups",
    "description": "Get all users with their groups\n\nRetrieve all users along with their group memberships in a single optimized query.<br><br>\n<b>Overview:</b><br>\nThis endpoint returns users with their associated groups pre-loaded, eliminating the need for separate group lookup calls. Ideal for admin dashboards that need to display user permissions at a glance.<br><br>\n<b>Use Cases:</b><br>\n<ul>\n<li>Admin dashboards showing user-group matrix</li>\n<li>Permission auditing and compliance checks</li>\n<li>Bulk user management interfaces</li>\n<li>Access control visualization</li>\n</ul>\n<b>Response Data per User:</b><br>\n<ul>\n<li><code>_id</code>: User's unique identifier</li>\n<li><code>userId</code>: User's public-facing ID</li>\n<li><code>orgId</code>: Organization identifier</li>\n<li><code>fullName</code>: User's display name</li>\n<li><code>hasLoggedIn</code>: Whether user has ever logged in</li>\n<li><code>groups</code>: Array of group objects with name and type</li>\n</ul>\n<b>Group Types Returned:</b><br>\n<ul>\n<li><code>admin</code>: Administrative groups with elevated permissions</li>\n<li><code>standard</code>: Regular user groups</li>\n<li><code>everyone</code>: Default group containing all org users</li>\n<li><code>custom</code>: Custom groups created by admins</li>\n</ul>\n<b>Performance Notes:</b><br>\nUses aggregation pipeline for efficient single-query retrieval. Cached results for improved performance on large organizations.\n"
  },
  {
    "name": "users-get-email-by-id",
    "description": "Get user email by ID\n\nRetrieve the email address for a specific user. This is a dedicated endpoint for email lookup with proper access controls.<br><br>\n<b>Overview:</b><br>\nThis endpoint provides direct access to a user's email address. It exists separately from the main user endpoint to allow granular permission control over email visibility.<br><br>\n<b>Use Cases:</b><br>\n<ul>\n<li>Admin communication workflows</li>\n<li>Invitation and notification systems</li>\n<li>Email-based user lookup</li>\n<li>Contact information export</li>\n</ul>\n<b>Privacy Considerations:</b><br>\n<ul>\n<li>Only organization admins can access this endpoint</li>\n<li>Access is logged for audit purposes</li>\n<li>Consider GDPR/privacy regulations when exposing emails</li>\n</ul>\n<b>Authorization:</b><br>\nRequires admin privileges. Regular users should use the main user endpoint which may mask emails based on organization settings.\n"
  },
  {
    "name": "users-get-by-ids-bulk",
    "description": "Get users by IDs (bulk)\n\nRetrieve multiple users by their IDs in a single optimized request. Ideal for efficiently fetching a specific set of users.<br><br>\n<b>Overview:</b><br>\nThis bulk endpoint allows fetching multiple users in a single API call, reducing network overhead when you need to display information about several known users.<br><br>\n<b>Use Cases:</b><br>\n<ul>\n<li>Fetching user details for a list of team members</li>\n<li>Populating user cards in a dashboard</li>\n<li>Loading participants in a document or conversation</li>\n<li>Building user mention/autocomplete features</li>\n</ul>\n<b>Request Format:</b><br>\n<ul>\n<li>Send array of user IDs in request body</li>\n<li>Each ID must be valid 24-character MongoDB ObjectId</li>\n<li>Maximum 100 IDs per request (for performance)</li>\n<li>Duplicate IDs are automatically deduplicated</li>\n</ul>\n<b>Response Behavior:</b><br>\n<ul>\n<li>Returns array of found users</li>\n<li>Order matches order of requested IDs</li>\n<li>Non-existent or deleted users are silently omitted</li>\n<li>Partial results returned if some IDs are invalid</li>\n</ul>\n<b>Performance Notes:</b><br>\nUses single database query with $in operator for optimal performance. Preferable to multiple individual user fetches.\n"
  },
  {
    "name": "users-update-full-name",
    "description": "Update user full name\n\nUpdate the full name of a user. This is a targeted update endpoint for changing only the display name without affecting other profile fields.<br><br>\n<b>Overview:</b><br>\nThis endpoint updates a user's fullName field, which is their primary display name throughout the application. The firstName and lastName fields may also be updated based on name parsing logic.<br><br>\n<b>Authorization:</b><br>\n<ul>\n<li><b>Self-update:</b> Users can update their own full name</li>\n<li><b>Admin-update:</b> Admins can update any user's name</li>\n</ul>\n<b>Side Effects:</b><br>\n<ul>\n<li>Updates fullName field</li>\n<li>May parse and update firstName/lastName</li>\n<li>User update event published</li>\n<li>Cached user data invalidated</li>\n</ul>\n<b>Use Cases:</b><br>\n<ul>\n<li>User profile name change</li>\n<li>Name correction by admin</li>\n<li>Legal name update</li>\n</ul>\n"
  },
  {
    "name": "users-update-first-name",
    "description": "Update user first name\n\nUpdate only the first name of a user without affecting other profile fields.<br><br>\n<b>Overview:</b><br>\nThis targeted endpoint updates just the firstName field. Useful when you need fine-grained control over name components rather than updating the full name.<br><br>\n<b>Authorization:</b><br>\n<ul>\n<li><b>Self-update:</b> Users can update their own first name</li>\n<li><b>Admin-update:</b> Admins can update any user's first name</li>\n</ul>\n<b>Note:</b> This does NOT automatically update the fullName field. Use <code>/users/{id}/fullname</code> if you need to update the complete display name.\n"
  },
  {
    "name": "users-update-last-name",
    "description": "Update user last name\n\nUpdate only the last name of a user without affecting other profile fields.<br><br>\n<b>Overview:</b><br>\nThis targeted endpoint updates just the lastName field. Useful for fine-grained control over name components.<br><br>\n<b>Authorization:</b><br>\n<ul>\n<li><b>Self-update:</b> Users can update their own last name</li>\n<li><b>Admin-update:</b> Admins can update any user's last name</li>\n</ul>\n<b>Note:</b> This does NOT automatically update the fullName field. Use <code>/users/{id}/fullname</code> if you need to update the complete display name.\n"
  },
  {
    "name": "users-update-designation",
    "description": "Update user designation\n\nUpdate the job title or designation of a user.<br><br>\n<b>Overview:</b><br>\nThis endpoint updates the user's designation field, which typically represents their job title, role, or position within the organization.<br><br>\n<b>Authorization:</b><br>\n<ul>\n<li><b>Self-update:</b> Users can update their own designation</li>\n<li><b>Admin-update:</b> Admins can update any user's designation</li>\n</ul>\n<b>Common Values:</b><br>\n<ul>\n<li>Software Engineer</li>\n<li>Product Manager</li>\n<li>Team Lead</li>\n<li>Director of Engineering</li>\n</ul>\n<b>Display:</b><br>\nDesignation is shown in user profiles, team views, and organizational charts.\n"
  },
  {
    "name": "users-check-is-admin",
    "description": "Check if user is admin\n\nVerify whether a specific user has administrative privileges in the organization.<br><br>\n<b>Overview:</b><br>\nThis endpoint checks if the specified user belongs to an admin group and has elevated permissions. It's useful for authorization checks before performing admin-only operations.<br><br>\n<b>What Makes a User an Admin:</b><br>\n<ul>\n<li>Member of a group with type \"admin\"</li>\n<li>Has explicit admin role assignment</li>\n<li>Organization owner (always admin)</li>\n</ul>\n<b>Use Cases:</b><br>\n<ul>\n<li>UI permission checks before showing admin features</li>\n<li>Pre-flight authorization validation</li>\n<li>Access control for sensitive operations</li>\n</ul>\n<b>Response Codes:</b><br>\n<ul>\n<li><code>200</code>: User IS an admin</li>\n<li><code>403</code>: User is NOT an admin</li>\n</ul>\n"
  },
  {
    "name": "users-upload-display-picture",
    "description": "Upload display picture\n\nUpload or update the display picture (avatar) for the authenticated user.<br><br>\n<b>Overview:</b><br>\nThis endpoint allows users to upload their profile picture. The image is processed, resized, and stored for use throughout the application.<br><br>\n<b>File Requirements:</b><br>\n<ul>\n<li><b>Allowed types:</b> PNG, JPEG, JPG, WebP, GIF</li>\n<li><b>Maximum size:</b> 1MB (1,048,576 bytes)</li>\n<li><b>Recommended dimensions:</b> 256x256 pixels or larger</li>\n<li><b>Aspect ratio:</b> Square recommended (will be cropped to square)</li>\n</ul>\n<b>Image Processing:</b><br>\n<ul>\n<li>Images are automatically resized to standard dimensions</li>\n<li>Converted to JPEG for consistency and smaller file size</li>\n<li>Multiple sizes may be generated (thumbnail, standard, large)</li>\n<li>Original is not preserved</li>\n</ul>\n<b>Side Effects:</b><br>\n<ul>\n<li>Previous display picture is replaced</li>\n<li>Cached images are invalidated</li>\n<li>CDN cache may take time to update</li>\n</ul>\n<b>Authorization:</b><br>\nUsers can only upload their own display picture. Admins cannot upload on behalf of other users.\n"
  },
  {
    "name": "users-get-display-picture",
    "description": "Get display picture\n\nRetrieve the current user's display picture image.<br><br>\n<b>Overview:</b><br>\nThis endpoint returns the user's profile picture as binary image data. Use this for displaying the user's avatar in the application.<br><br>\n<b>Response Format:</b><br>\n<ul>\n<li>Returns raw image data (not JSON)</li>\n<li>Content-Type header indicates image format (typically image/jpeg)</li>\n<li>Suitable for use directly in &lt;img&gt; src or CSS background</li>\n</ul>\n<b>Caching:</b><br>\n<ul>\n<li>Response includes cache headers for browser caching</li>\n<li>Use ETag for conditional requests</li>\n<li>Cache invalidated when picture is updated</li>\n</ul>\n<b>Alternative:</b><br>\nFor signed URL access, use the user profile endpoint which returns a <code>displayPictureUrl</code> field.\n"
  },
  {
    "name": "users-remove-display-picture",
    "description": "Remove display picture\n\nRemove the current user's display picture and revert to default avatar.<br><br>\n<b>Overview:</b><br>\nThis endpoint permanently removes the user's uploaded profile picture. After removal, the user will display a default avatar (typically initials or generic icon).<br><br>\n<b>What Happens:</b><br>\n<ul>\n<li>Profile picture file is deleted from storage</li>\n<li>User profile updated to remove picture reference</li>\n<li>Cached images invalidated</li>\n<li>Default avatar will be shown in UI</li>\n</ul>\n<b>Note:</b><br>\nThis action is immediate and irreversible. To restore a picture, user must upload a new one.\n"
  },
  {
    "name": "users-bulk-invite",
    "description": "Bulk invite users\n\nInvite multiple users to the organization in a single operation. Ideal for onboarding entire teams at once.<br><br>\n<b>Overview:</b><br>\nThis endpoint creates user accounts for multiple email addresses and sends invitation emails to all of them. It's the most efficient way to add multiple users to your organization.<br><br>\n<b>Invitation Flow:</b><br>\n<ol>\n<li>Validate all email addresses</li>\n<li>Check for existing accounts (skip duplicates)</li>\n<li>Create user accounts for new emails</li>\n<li>Restore any previously deleted accounts</li>\n<li>Add users to specified groups (optional)</li>\n<li>Send invitation emails to all new users</li>\n</ol>\n<b>Requirements:</b><br>\n<ul>\n<li><b>Account Type:</b> Business accounts only (not individual)</li>\n<li><b>SMTP:</b> Email configuration must be set up</li>\n<li><b>Authorization:</b> Admin privileges required</li>\n</ul>\n<b>Email Processing:</b><br>\n<ul>\n<li>Duplicate emails are automatically skipped</li>\n<li>Invalid email formats are rejected</li>\n<li>Existing users are not re-invited (use resend-invite)</li>\n<li>Previously deleted users are restored</li>\n</ul>\n<b>Response Details:</b><br>\nResponse includes count of successful invites and any failures with reasons.\n"
  },
  {
    "name": "users-resend-invite",
    "description": "Resend user invite\n\nResend the invitation email to a user who hasn't completed their account setup.<br><br>\n<b>Overview:</b><br>\nThis endpoint resends the invitation email to a user who was previously invited but hasn't logged in yet. Useful when the original invitation email was lost, expired, or ended up in spam.<br><br>\n<b>When to Use:</b><br>\n<ul>\n<li>User didn't receive original invitation</li>\n<li>Invitation link expired</li>\n<li>User forgot to complete setup</li>\n<li>Email went to spam folder</li>\n</ul>\n<b>Requirements:</b><br>\n<ul>\n<li>User must exist in the system</li>\n<li>User must NOT have logged in yet (hasLoggedIn: false)</li>\n<li>SMTP configuration must be active</li>\n<li>Admin privileges required</li>\n</ul>\n<b>What Happens:</b><br>\n<ul>\n<li>Generates a new invitation token</li>\n<li>Invalidates any previous invitation links</li>\n<li>Sends new invitation email</li>\n<li>Resets invitation expiry timer</li>\n</ul>\n"
  },
  {
    "name": "users-list-graph",
    "description": "List users (paginated with graph data)\n\nRetrieve a paginated list of users with enhanced search capabilities using the graph service.<br><br>\n<b>Overview:</b><br>\nThis endpoint provides advanced user listing with full-text search, pagination, and optional relationship data from the knowledge graph. It's optimized for large organizations with thousands of users.<br><br>\n<b>Search Capabilities:</b><br>\n<ul>\n<li>Full-text search across name and email</li>\n<li>Fuzzy matching for typo tolerance</li>\n<li>Results ranked by relevance</li>\n</ul>\n<b>Use Cases:</b><br>\n<ul>\n<li>User directory with search</li>\n<li>Autocomplete user selection</li>\n<li>Admin user management lists</li>\n<li>User analytics dashboards</li>\n</ul>\n<b>Performance:</b><br>\n<ul>\n<li>Powered by graph database for fast queries</li>\n<li>Supports pagination for large datasets</li>\n<li>Results cached for repeated queries</li>\n</ul>\n<b>vs /users endpoint:</b><br>\nUse this endpoint when you need advanced search or are dealing with large user bases. Use <code>/users</code> for simple full-list retrieval.\n"
  },
  {
    "name": "users-get-teams",
    "description": "Get current user's teams\n\nGet teams that the current user belongs to"
  },
  {
    "name": "teams-create",
    "description": "Create a team\n\nCreate a new team within the organization for project collaboration and resource sharing.<br><br>\n<b>Overview:</b><br>\nTeams are collaborative units that group users together for specific projects, departments, or initiatives. Teams have their own resources, permissions, and member hierarchies.<br><br>\n<b>Team Structure:</b><br>\n<ul>\n<li><b>Owner:</b> Creator of the team, full administrative control</li>\n<li><b>Admins:</b> Can manage members and settings</li>\n<li><b>Members:</b> Standard access to team resources</li>\n<li><b>Viewers:</b> Read-only access</li>\n</ul>\n<b>What Gets Created:</b><br>\n<ul>\n<li>Team entity with unique identifier</li>\n<li>Owner role automatically assigned to creator</li>\n<li>Team workspace for shared resources</li>\n<li>Default permission settings</li>\n</ul>\n<b>Initial Members:</b><br>\nYou can optionally add initial members with their roles during creation using the <code>userRoles</code> array.<br><br>\n<b>Validation:</b><br>\n<ul>\n<li>Team name is required and must be unique in the org</li>\n<li>Name: 1-100 characters</li>\n<li>Description: Optional, max 500 characters</li>\n</ul>\n"
  },
  {
    "name": "teams-list",
    "description": "List teams\n\nRetrieve all teams in the organization with optional search and pagination.<br><br>\n<b>Overview:</b><br>\nThis endpoint returns teams the authenticated user can access. Admins see all teams; regular users see teams they're members of.<br><br>\n<b>Response Data per Team:</b><br>\n<ul>\n<li>Team metadata (name, description)</li>\n<li>Member count</li>\n<li>Owner information</li>\n<li>Creation timestamp</li>\n</ul>\n<b>Search:</b><br>\nThe search parameter performs fuzzy matching on team names and descriptions.<br><br>\n<b>Visibility Rules:</b><br>\n<ul>\n<li><b>Admins:</b> See all organization teams</li>\n<li><b>Users:</b> See only teams they belong to</li>\n</ul>\n<b>Sorting:</b><br>\nResults are sorted by name alphabetically by default.\n"
  },
  {
    "name": "teams-get-by-id",
    "description": "Get team by ID\n\nRetrieve detailed information about a specific team.<br><br>\n<b>Overview:</b><br>\nReturns complete team details including metadata, member list with roles, and resource information. Use this for team profile pages and detailed views.<br><br>\n<b>Response Includes:</b><br>\n<ul>\n<li>Team metadata (name, description, slug)</li>\n<li>Owner and creator information</li>\n<li>Member count and list (with pagination)</li>\n<li>Team settings and permissions</li>\n<li>Creation and modification timestamps</li>\n</ul>\n<b>Authorization:</b><br>\n<ul>\n<li>Team members can view their team</li>\n<li>Organization admins can view any team</li>\n</ul>\n"
  },
  {
    "name": "teams-update",
    "description": "Update team\n\nUpdate team metadata and settings.<br><br>\n<b>Overview:</b><br>\nThis endpoint allows updating team properties like name and description. Member management is handled through separate endpoints.<br><br>\n<b>Updatable Fields:</b><br>\n<ul>\n<li><code>name</code>: Team display name (must remain unique)</li>\n<li><code>description</code>: Team description</li>\n</ul>\n<b>Authorization:</b><br>\n<ul>\n<li><b>Team Owner:</b> Full update access</li>\n<li><b>Team Admin:</b> Can update name and description</li>\n<li><b>Org Admin:</b> Can update any team</li>\n</ul>\n<b>Side Effects:</b><br>\n<ul>\n<li>Team update event published</li>\n<li>Team slug may be regenerated if name changes</li>\n<li>Cached team data invalidated</li>\n</ul>\n"
  },
  {
    "name": "teams-delete",
    "description": "Delete team\n\nDelete a team from the organization.<br><br>\n<b>Behavior:</b><br>\n<ul>\n<li>Team is soft-deleted (isDeleted: true)</li>\n<li>Team members lose access to team resources</li>\n<li>Team can be restored by admin if needed</li>\n</ul>\n<b>Restrictions:</b><br>\n<ul>\n<li>Only team owner or organization admin can delete</li>\n<li>Team must have no active resources (configurable)</li>\n</ul>\n"
  },
  {
    "name": "teams-get-users",
    "description": "Get team members\n\nRetrieve all users that are members of a specific team.<br><br>\n<b>Response Details:</b><br>\n<ul>\n<li>Returns user profiles with their team role</li>\n<li>Supports pagination for large teams</li>\n<li>Excludes deleted or inactive users</li>\n</ul>\n<b>Team Roles:</b><br>\n<ul>\n<li><code>owner</code> - Full control over team settings and members</li>\n<li><code>admin</code> - Can manage members and most settings</li>\n<li><code>member</code> - Standard team member</li>\n<li><code>viewer</code> - Read-only access to team resources</li>\n</ul>\n"
  },
  {
    "name": "teams-add-users",
    "description": "Add users to team\n\nAdd one or more users to a team with specified roles.<br><br>\n<b>Behavior:</b><br>\n<ul>\n<li>Users already in the team are skipped</li>\n<li>Default role is \"member\" if not specified</li>\n<li>Sends invitation notification to added users</li>\n</ul>\n<b>Validation:</b><br>\n<ul>\n<li>All user IDs must be valid and from the same organization</li>\n<li>Role must be one of the allowed values</li>\n<li>Only team owner/admin can add members</li>\n</ul>\n"
  },
  {
    "name": "teams-remove-users",
    "description": "Remove users from team\n\nRemove one or more users from a team.<br><br>\n<b>Behavior:</b><br>\n<ul>\n<li>Users not in the team are silently skipped</li>\n<li>Removed users lose access to team resources immediately</li>\n</ul>\n<b>Restrictions:</b><br>\n<ul>\n<li>Cannot remove the team owner</li>\n<li>Only team owner/admin can remove members</li>\n<li>Admins cannot remove other admins (only owner can)</li>\n</ul>\n"
  },
  {
    "name": "teams-update-user-permissions",
    "description": "Update user role in team\n\nUpdate a user's role/permissions within a team.<br><br>\n<b>Available Roles:</b><br>\n<ul>\n<li><code>owner</code> - Full control (only one per team, transferable)</li>\n<li><code>admin</code> - Can manage members and settings</li>\n<li><code>member</code> - Standard access</li>\n<li><code>viewer</code> - Read-only access</li>\n</ul>\n<b>Restrictions:</b><br>\n<ul>\n<li>Only team owner can promote to admin</li>\n<li>Only team owner can transfer ownership</li>\n<li>Admins can modify member/viewer roles</li>\n</ul>\n"
  },
  {
    "name": "teams-list-for-user",
    "description": "Get current user's teams\n\nRetrieve all teams that the authenticated user is a member of.<br><br>\n<b>Response Details:</b><br>\n<ul>\n<li>Includes teams where user is owner, admin, member, or viewer</li>\n<li>Returns user's role in each team</li>\n<li>Sorted by most recently accessed</li>\n</ul>\n<b>Use Cases:</b><br>\n<ul>\n<li>Populating team switcher in UI</li>\n<li>Dashboard team list</li>\n<li>Access control checks</li>\n</ul>\n"
  },
  {
    "name": "teams-get-created-by-user",
    "description": "Get teams created by current user\n\nRetrieve all teams that were created by the authenticated user.<br><br>\n<b>Response Details:</b><br>\n<ul>\n<li>Only includes teams where user is the original creator</li>\n<li>User may or may not still be the owner (ownership can be transferred)</li>\n<li>Useful for tracking team creation history</li>\n</ul>\n"
  },
  {
    "name": "organizations-check-exists",
    "description": "Check if organization exists\n\nCheck if any organization has been created in the system. This is typically the first API call made during initial setup.<br><br>\n<b>Overview:</b><br>\nThis public endpoint determines whether the system has been initialized with an organization. Used by the frontend to decide whether to show the setup wizard or the login screen.<br><br>\n<b>Use Cases:</b><br>\n<ul>\n<li>First-time setup detection</li>\n<li>Onboarding flow decisions</li>\n<li>System initialization checks</li>\n</ul>\n<b>Response:</b><br>\n<ul>\n<li><code>exists: true</code> - Organization exists, show login</li>\n<li><code>exists: false</code> - No organization, show setup wizard</li>\n</ul>\n<b>Note:</b> This endpoint requires no authentication and is publicly accessible.\n"
  },
  {
    "name": "organizations-create",
    "description": "Create organization\n\nCreate a new organization and its first admin user. This is the initial setup endpoint for new PipesHub installations.<br><br>\n<b>Overview:</b><br>\nThis endpoint performs the complete initial setup of a PipesHub instance, including creating the organization entity and its first administrator account. Should only be called once during initial setup.<br><br>\n<b>Setup Flow:</b><br>\n<ol>\n<li>Frontend calls <code>/org/exists</code> to check if setup is needed</li>\n<li>If no organization exists, show setup wizard</li>\n<li>Collect organization and admin details</li>\n<li>Call this endpoint to create organization</li>\n<li>User is automatically logged in as admin</li>\n</ol>\n<b>What Gets Created:</b><br>\n<ul>\n<li>Organization entity with provided details</li>\n<li>Admin user account with provided credentials</li>\n<li>Default user groups (admin, everyone)</li>\n<li>Default system settings</li>\n<li>Initial authentication configuration</li>\n</ul>\n<b>Account Types:</b><br>\n<ul>\n<li><code>individual</code>: Single-user account, limited team features</li>\n<li><code>business</code>: Multi-user organization with full features</li>\n</ul>\n<b>Security:</b><br>\n<ul>\n<li>This endpoint only works if no organization exists</li>\n<li>Password must meet security requirements</li>\n<li>Email verification may be required based on config</li>\n</ul>\n"
  },
  {
    "name": "organizations-get-current",
    "description": "Get current organization\n\nRetrieve details about the authenticated user's organization.<br><br>\n<b>Overview:</b><br>\nThis endpoint returns complete information about the current user's organization, including profile data, settings, and configuration. Use this for organization profile pages and settings.<br><br>\n<b>Response Includes:</b><br>\n<ul>\n<li>Organization profile (name, email, address)</li>\n<li>Account type and billing status</li>\n<li>Feature flags and limits</li>\n<li>Branding settings (logo, colors)</li>\n<li>Creation and modification timestamps</li>\n</ul>\n<b>Use Cases:</b><br>\n<ul>\n<li>Organization profile pages</li>\n<li>Settings and configuration screens</li>\n<li>Billing and subscription displays</li>\n<li>White-label branding retrieval</li>\n</ul>\n<b>Note:</b><br>\nAll authenticated users can access this endpoint to view their organization's details.\n"
  },
  {
    "name": "organizations-update",
    "description": "Update organization\n\nUpdate organization profile and settings information.<br><br>\n<b>Overview:</b><br>\nThis endpoint allows administrators to update the organization's profile information, contact details, and address. Used in the organization settings section of the admin panel.<br><br>\n<b>Updatable Fields:</b><br>\n<ul>\n<li><code>registeredName</code>: Official registered/legal name of the organization</li>\n<li><code>shortName</code>: Short display name used in UI</li>\n<li><code>phoneNumber</code>: Primary contact phone number</li>\n<li><code>permanentAddress</code>: Full address object with street, city, state, country, postal code</li>\n</ul>\n<b>Restrictions:</b><br>\n<ul>\n<li>Only organization admins can perform updates</li>\n<li>Contact email cannot be changed through this endpoint</li>\n<li>Account type cannot be changed after creation</li>\n</ul>\n<b>Side Effects:</b><br>\n<ul>\n<li>Organization update event is published</li>\n<li>Cached organization data is invalidated</li>\n<li>Changes are reflected immediately across all services</li>\n</ul>\n<b>Validation:</b><br>\n<ul>\n<li>Phone number must be valid international format</li>\n<li>Address fields have maximum length constraints</li>\n<li>Names cannot be empty if provided</li>\n</ul>\n"
  },
  {
    "name": "organizations-delete",
    "description": "Delete organization\n\nPermanently delete an organization and all associated data.<br><br>\n<b>WARNING:</b> This action is <b>irreversible</b>.<br><br>\n<b>Data Deleted:</b><br>\n<ul>\n<li>All user accounts in the organization</li>\n<li>All teams and user groups</li>\n<li>All documents and storage data</li>\n<li>All configuration and settings</li>\n</ul>\n<b>Requirements:</b><br>\n<ul>\n<li>Must be the organization owner (super admin)</li>\n<li>Must provide confirmation parameter</li>\n<li>All active subscriptions must be cancelled first</li>\n</ul>\n"
  },
  {
    "name": "organizations-upload-logo",
    "description": "Upload organization logo\n\nUpload or update the organization's logo image.<br><br>\n<b>Supported Formats:</b><br>\n<ul>\n<li>PNG (recommended for transparency)</li>\n<li>JPG/JPEG</li>\n<li>SVG</li>\n<li>WebP</li>\n</ul>\n<b>Requirements:</b><br>\n<ul>\n<li>Maximum file size: 5MB</li>\n<li>Recommended dimensions: 256x256 pixels or higher</li>\n<li>Square aspect ratio recommended</li>\n</ul>\n<b>Side Effects:</b><br>\n<ul>\n<li>Previous logo is replaced</li>\n<li>Multiple sizes may be generated for different use cases</li>\n</ul>\n"
  },
  {
    "name": "organizations-get-logo",
    "description": "Get organization logo\n\nRetrieve the organization's logo image or URL.<br><br>\n<b>Response Formats:</b><br>\n<ul>\n<li>Returns a signed URL to access the logo</li>\n<li>URL is valid for a limited time (typically 1 hour)</li>\n</ul>\n<b>Use Cases:</b><br>\n<ul>\n<li>Displaying logo in navigation/header</li>\n<li>Email templates</li>\n<li>White-label branding</li>\n</ul>\n"
  },
  {
    "name": "organizations-delete-logo",
    "description": "Delete organization logo\n\nRemove the organization's custom logo.<br><br>\n<b>Behavior:</b><br>\n<ul>\n<li>Logo file is permanently deleted from storage</li>\n<li>Organization reverts to default/placeholder logo</li>\n</ul>\n"
  },
  {
    "name": "organizations-get-onboarding-status",
    "description": "Get onboarding status\n\nRetrieve the organization's onboarding progress and status.<br><br>\n<b>Response Details:</b><br>\n<ul>\n<li>Current onboarding step</li>\n<li>Completion status of each step</li>\n<li>Overall completion percentage</li>\n</ul>\n<b>Onboarding Steps:</b><br>\n<ul>\n<li>Organization profile setup</li>\n<li>Admin account configuration</li>\n<li>Invite team members</li>\n<li>Connect integrations</li>\n<li>Configure settings</li>\n</ul>\n"
  },
  {
    "name": "organizations-update-onboarding-status",
    "description": "Update onboarding status\n\nUpdate the organization's onboarding progress.<br><br>\n<b>Use Cases:</b><br>\n<ul>\n<li>Mark a step as completed</li>\n<li>Skip optional steps</li>\n<li>Complete entire onboarding</li>\n</ul>\n<b>Behavior:</b><br>\n<ul>\n<li>Steps must be completed in order (unless skippable)</li>\n<li>Completing all required steps marks onboarding as complete</li>\n</ul>\n"
  },
  {
    "name": "user-groups-create",
    "description": "Create user group\n\nCreate a new user group within the organization.<br><br>\n<b>Group Types:</b><br>\n<ul>\n<li><code>admin</code> - Administrative group with elevated privileges</li>\n<li><code>standard</code> - Regular user group</li>\n<li><code>everyone</code> - Automatically includes all organization users</li>\n<li><code>custom</code> - Custom group with manual membership management</li>\n</ul>\n<b>Validation Rules:</b><br>\n<ul>\n<li>Group name must be unique within the organization</li>\n<li>Group name is required and cannot be empty</li>\n<li>Type must be one of the allowed values</li>\n</ul>\n<b>Side Effects:</b><br>\n<ul>\n<li>Creates a unique slug from the group name</li>\n<li>Sets createdBy to the authenticated user</li>\n</ul>\n"
  },
  {
    "name": "user-groups-get",
    "description": "Get all user groups\n\nRetrieve all user groups in the organization.<br><br>\n<b>Response Details:</b><br>\n<ul>\n<li>Returns all groups including admin, standard, everyone, and custom types</li>\n<li>Groups are returned with their member counts</li>\n<li>Soft-deleted groups are excluded by default</li>\n</ul>\n<b>Use Cases:</b><br>\n<ul>\n<li>Populating group selection dropdowns</li>\n<li>Managing group memberships</li>\n<li>Access control configuration</li>\n</ul>\n"
  },
  {
    "name": "user-groups-get-by-id",
    "description": "Get user group by ID\n\nRetrieve detailed information about a specific user group.<br><br>\n<b>Response Includes:</b><br>\n<ul>\n<li>Group metadata (name, type, description)</li>\n<li>Member count</li>\n<li>Creation and modification timestamps</li>\n<li>Creator information</li>\n</ul>\n"
  },
  {
    "name": "user-groups-update",
    "description": "Update user group\n\nUpdate an existing user group's information.<br><br>\n<b>Updatable Fields:</b><br>\n<ul>\n<li><code>name</code> - Display name (must remain unique)</li>\n<li><code>description</code> - Group description</li>\n</ul>\n<b>Note:</b> Group type cannot be changed after creation.\n"
  },
  {
    "name": "user-groups-delete",
    "description": "Delete user group\n\nSoft delete a user group.<br><br>\n<b>Behavior:</b><br>\n<ul>\n<li>Group is marked as deleted (isDeleted: true)</li>\n<li>Group members are not affected</li>\n<li>Group can be restored by admin if needed</li>\n</ul>\n<b>Restrictions:</b><br>\n<ul>\n<li>Cannot delete system groups (admin, everyone)</li>\n<li>Requires admin privileges</li>\n</ul>\n"
  },
  {
    "name": "user-groups-add-users",
    "description": "Add users to group\n\nAdd one or more users to a user group.<br><br>\n<b>Behavior:</b><br>\n<ul>\n<li>Users already in the group are silently skipped</li>\n<li>Invalid user IDs are reported in the response</li>\n<li>Operation is atomic - all valid users are added together</li>\n</ul>\n<b>Validation:</b><br>\n<ul>\n<li>All user IDs must be valid MongoDB ObjectIds</li>\n<li>Users must belong to the same organization</li>\n<li>Group must exist and not be deleted</li>\n</ul>\n"
  },
  {
    "name": "user-groups-remove-users",
    "description": "Remove users from group\n\nRemove one or more users from a user group.<br><br>\n<b>Behavior:</b><br>\n<ul>\n<li>Users not in the group are silently skipped</li>\n<li>Operation is atomic - all specified users are removed together</li>\n</ul>\n<b>Restrictions:</b><br>\n<ul>\n<li>Cannot remove users from \"everyone\" group type</li>\n<li>Cannot remove the last admin from admin group</li>\n</ul>\n"
  },
  {
    "name": "user-groups-get-users",
    "description": "Get users in a group\n\nRetrieve all users that belong to a specific user group.<br><br>\n<b>Response Details:</b><br>\n<ul>\n<li>Returns user profiles with basic information</li>\n<li>Supports pagination for large groups</li>\n<li>Excludes deleted users</li>\n</ul>\n"
  },
  {
    "name": "user-groups-get-for-user",
    "description": "Get groups for a user\n\nRetrieve all user groups that a specific user belongs to.<br><br>\n<b>Response Details:</b><br>\n<ul>\n<li>Includes all group types (admin, standard, everyone, custom)</li>\n<li>Returns group metadata for each membership</li>\n</ul>\n<b>Use Cases:</b><br>\n<ul>\n<li>Displaying user's group memberships in profile</li>\n<li>Access control checks</li>\n<li>Permission inheritance calculations</li>\n</ul>\n"
  },
  {
    "name": "user-groups-get-stats",
    "description": "Get user group statistics\n\nRetrieve statistics for all user groups in the organization.<br><br>\n<b>Statistics Include:</b><br>\n<ul>\n<li>Total number of groups by type</li>\n<li>Member counts per group</li>\n<li>Active vs deleted groups</li>\n<li>Recently created/modified groups</li>\n</ul>\n<b>Use Cases:</b><br>\n<ul>\n<li>Admin dashboard displays</li>\n<li>Organization analytics</li>\n<li>Capacity planning</li>\n</ul>\n"
  },
  {
    "name": "documents-upload",
    "description": "Upload a new document\n\nUpload a new document to PipesHub storage. Supports multiple storage backends including S3, Azure Blob, and local storage.<br><br>\n<b>Overview:</b><br>\nThis endpoint handles document uploads with automatic processing, metadata extraction, and optional versioning. It's the primary endpoint for adding new files to PipesHub.<br><br>\n<b>Upload Flow:</b><br>\n<ol>\n<li>Client sends file with metadata via multipart/form-data</li>\n<li>Document metadata saved to database</li>\n<li>Returns document object with storage URLs</li>\n</ol>\n<b>File Size Limits:</b><br>\n<ul>\n<li><b>Maximum:</b> 1GB (1,073,741,824 bytes)</li>\n<li><b>Large file threshold:</b> 10MB (triggers direct upload flow)</li>\n</ul>\n<b>Supported File Types:</b><br>\n<ul>\n<li><b>Documents:</b> PDF, DOCX, DOC, XLSX, XLS, PPTX, PPT, TXT, MD, CSV</li>\n<li><b>Images:</b> PNG, JPG, JPEG, GIF, WebP, SVG, BMP, TIFF</li>\n<li><b>Videos:</b> MP4, AVI, MOV, MKV, WebM</li>\n<li><b>Audio:</b> MP3, WAV, FLAC, AAC</li>\n<li><b>Archives:</b> ZIP, RAR, 7Z, TAR, GZ</li>\n</ul>\n<b>Version Control:</b><br>\nSet <code>isVersionedFile: \"true\"</code> to enable version tracking. Versioned documents maintain full history of all changes.<br><br>\n<b>Response Headers:</b><br>\n<ul>\n<li><code>x-document-id</code>: Unique document identifier</li>\n<li><code>x-document-name</code>: Document name as stored</li>\n</ul>\n<b>Storage Backends:</b><br>\nAutomatically routes to configured storage: Amazon S3, Azure Blob Storage, or Local filesystem.\n"
  },
  {
    "name": "document-upload-create-placeholder",
    "description": "Create document placeholder\n\nCreate a document metadata record without uploading file content. Used in conjunction with direct upload for large files.<br><br>\n<b>Overview:</b><br>\nThis endpoint creates a document entry in the database without actual file content. The file is then uploaded directly to storage using the <code>/directUpload</code> endpoint.<br><br>\n<b>Direct Upload Flow:</b><br>\n<ol>\n<li>Call this endpoint to create document placeholder</li>\n<li>Receive document ID in response</li>\n<li>Call <code>/document/{documentId}/directUpload</code> to get presigned URL</li>\n<li>Upload file directly to presigned URL</li>\n<li>Document becomes accessible once upload completes</li>\n</ol>\n<b>Use Cases:</b><br>\n<ul>\n<li>Large file uploads (bypassing server)</li>\n<li>Client-side upload progress tracking</li>\n<li>Resumable uploads</li>\n<li>Reduced server memory usage</li>\n</ul>\n<b>Note:</b> Extension must be provided without the dot (e.g., \"pdf\" not \".pdf\").\n"
  },
  {
    "name": "document-upload-get-direct-url",
    "description": "Get direct upload URL\n\nGenerate a presigned URL for direct client-to-storage upload, bypassing the server for large files.<br><br>\n<b>Overview:</b><br>\nThis endpoint provides a presigned URL that allows clients to upload directly to storage (S3/Azure) without routing through the server. Essential for large file uploads.<br><br>\n<b>Direct Upload Flow:</b><br>\n<ol>\n<li>Create document placeholder with <code>/placeholder</code></li>\n<li>Call this endpoint with document ID</li>\n<li>Receive presigned URL and document ID</li>\n<li>Client uploads file directly to presigned URL (PUT request)</li>\n<li>Document becomes available once upload completes</li>\n</ol>\n<b>Benefits:</b><br>\n<ul>\n<li>No server memory consumption for large files</li>\n<li>Direct transfer to storage (faster)</li>\n<li>Client-side progress tracking</li>\n<li>Reduced server bandwidth</li>\n</ul>\n<b>URL Validity:</b><br>\nPresigned URLs typically expire after 1 hour. Upload must complete before expiration.<br><br>\n<b>Note:</b> Only available for S3 and Azure Blob storage. Local storage does not support direct upload.\n"
  },
  {
    "name": "document-management-get",
    "description": "Get document by ID\n\nRetrieve complete document metadata by its unique identifier.<br><br>\n<b>Overview:</b><br>\nReturns all document information including metadata, version history, storage location, and access permissions. Use this to display document details or prepare for download/edit operations.<br><br>\n<b>Response Includes:</b><br>\n<ul>\n<li>Document metadata (name, path, size, type)</li>\n<li>Storage information (vendor, URLs)</li>\n<li>Version history (if versioned)</li>\n<li>Permission settings</li>\n<li>Custom metadata</li>\n<li>Timestamps (created, updated)</li>\n</ul>\n<b>Authorization:</b><br>\nDocument must belong to the requesting user's organization.<br><br>\n<b>Note:</b> Soft-deleted documents (isDeleted: true) are not returned.\n"
  },
  {
    "name": "document-management-delete-by-id",
    "description": "Delete document\n\nSoft delete a document from the system. The document is marked as deleted but not permanently removed.<br><br>\n<b>Overview:</b><br>\nThis endpoint performs a soft delete, marking the document as deleted while preserving its data for potential recovery or audit purposes.<br><br>\n<b>What Happens on Delete:</b><br>\n<ul>\n<li><code>isDeleted</code> flag set to true</li>\n<li><code>deletedByUserId</code> recorded</li>\n<li>Document excluded from normal queries</li>\n<li>File remains in storage (soft delete)</li>\n</ul>\n<b>Restrictions:</b><br>\n<ul>\n<li>Document must belong to user's organization</li>\n<li>User must have appropriate permissions</li>\n</ul>\n<b>Recovery:</b><br>\nSoft-deleted documents can be restored by administrators if needed.\n"
  },
  {
    "name": "document-management-download",
    "description": "Download document\n\nGet a time-limited signed URL to download the document, or receive the file directly for local storage.<br><br>\n<b>Overview:</b><br>\nThis endpoint generates secure download access to documents. For cloud storage (S3/Azure), it returns a presigned URL. For local storage, it streams the file directly.<br><br>\n<b>Download Behavior by Storage:</b><br>\n<ul>\n<li><b>S3/Azure:</b> Returns presigned URL valid for specified duration</li>\n<li><b>Local:</b> Streams file directly with appropriate headers</li>\n</ul>\n<b>Version Download:</b><br>\nSpecify the <code>version</code> parameter to download a specific historical version. Only available for versioned documents.<br><br>\n<b>URL Expiration:</b><br>\n<ul>\n<li>Default: 3600 seconds (1 hour)</li>\n<li>Configurable via <code>expirationTimeInSeconds</code></li>\n<li>Maximum depends on storage provider limits</li>\n</ul>\n<b>Security:</b><br>\nSigned URLs are single-use and time-limited. They can be safely shared for temporary access.\n"
  },
  {
    "name": "document-buffer-get",
    "description": "Get document buffer\n\nRetrieve the raw binary content of a document as a buffer. Used for in-memory document processing.<br><br>\n<b>Overview:</b><br>\nReturns the complete file content as a binary buffer. This is useful for server-side document processing, content analysis, or format conversion.<br><br>\n<b>Use Cases:</b><br>\n<ul>\n<li>Document parsing and text extraction</li>\n<li>Format conversion pipelines</li>\n<li>Content analysis and indexing</li>\n<li>Thumbnail generation</li>\n</ul>\n<b>Version Support:</b><br>\nSpecify <code>version</code> to get a specific historical version's content.<br><br>\n<b>Memory Considerations:</b><br>\nLarge files will consume significant memory. For files &gt;100MB, consider using streaming download instead.<br><br>\n<b>Response Format:</b><br>\nReturns Node.js Buffer object serialized as JSON with type and data array.\n"
  },
  {
    "name": "document-buffer-update",
    "description": "Update document buffer\n\nReplace the document's file content with a new file. Updates the current version without creating version history.<br><br>\n<b>Overview:</b><br>\nThis endpoint replaces the document's content in storage. Use this for quick updates that don't need version tracking.<br><br>\n<b>When to Use:</b><br>\n<ul>\n<li>Updating draft documents</li>\n<li>Replacing temporary files</li>\n<li>Quick fixes without version history</li>\n</ul>\n<b>For Version Tracking:</b><br>\nUse <code>/uploadNextVersion</code> instead if you need to maintain version history.<br><br>\n<b>File Constraints:</b><br>\n<ul>\n<li>Maximum size: 100MB</li>\n<li>File extension must match original document</li>\n</ul>\n<b>Side Effects:</b><br>\n<ul>\n<li>Increments <code>mutationCount</code></li>\n<li>Updates <code>sizeInBytes</code></li>\n<li>Updates <code>updatedAt</code> timestamp</li>\n</ul>\n"
  },
  {
    "name": "version-control-upload-next-version",
    "description": "Upload next version\n\nUpload a new version of a versioned document, maintaining full version history.<br><br>\n<b>Overview:</b><br>\nThis endpoint creates a new version entry in the document's version history. The previous version remains accessible and the document can be rolled back if needed.<br><br>\n<b>Version Control Flow:</b><br>\n<ol>\n<li>Upload new file content</li>\n<li>System compares with previous version</li>\n<li>If different, creates new version entry</li>\n<li>Updates version history with metadata</li>\n<li>Current document points to new version</li>\n</ol>\n<b>Version Entry Contains:</b><br>\n<ul>\n<li>Version number (auto-incremented)</li>\n<li>Storage URL for this version</li>\n<li>Size and extension</li>\n<li>Optional note describing changes</li>\n<li>User who created version</li>\n<li>Timestamp</li>\n</ul>\n<b>Requirements:</b><br>\n<ul>\n<li>Document must have <code>isVersionedFile: true</code></li>\n<li>File extension must match original document</li>\n<li>Content must differ from previous version</li>\n</ul>\n<b>File Constraints:</b><br>\n<ul>\n<li>Maximum size: 100MB</li>\n<li>Same extension as original required</li>\n</ul>\n"
  },
  {
    "name": "version-control-rollback",
    "description": "Rollback to previous version\n\nRestore a versioned document to a previous version. Creates a new version entry with the rolled-back content.<br><br>\n<b>Overview:</b><br>\nThis endpoint allows reverting a document to any previous version while maintaining the complete version history. The rollback itself creates a new version entry.<br><br>\n<b>Rollback Flow:</b><br>\n<ol>\n<li>Specify target version number to rollback to</li>\n<li>System retrieves content from that version</li>\n<li>Creates new version entry with restored content</li>\n<li>Adds rollback note to version history</li>\n<li>Document now shows restored content</li>\n</ol>\n<b>Version History Preserved:</b><br>\nRollback does NOT delete intermediate versions. Full history remains intact for audit purposes.<br><br>\n<b>Requirements:</b><br>\n<ul>\n<li>Document must be versioned</li>\n<li>Target version must exist (less than current version count)</li>\n<li>Note explaining rollback reason is required</li>\n</ul>\n<b>Use Cases:</b><br>\n<ul>\n<li>Reverting accidental changes</li>\n<li>Restoring to known-good state</li>\n<li>Undoing problematic updates</li>\n</ul>\n"
  },
  {
    "name": "version-control-check-modified",
    "description": "Check if document is modified\n\nCheck if the current document content differs from the last saved version. Useful for detecting unsaved changes.<br><br>\n<b>Overview:</b><br>\nCompares the current document buffer with the most recent version in history to detect modifications. Returns true if content has changed since last version.<br><br>\n<b>Use Cases:</b><br>\n<ul>\n<li>Prompting user to save before closing</li>\n<li>Auto-save decision making</li>\n<li>Version creation validation</li>\n<li>Change detection in workflows</li>\n</ul>\n<b>Comparison Method:</b><br>\nPerforms binary comparison of file buffers. Identical content returns false even if edited and reverted.<br><br>\n<b>Requirements:</b><br>\nDocument must be versioned to have comparison baseline.\n"
  },
  {
    "name": "knowledge-bases-create",
    "description": "Create a new knowledge base\n\nCreate a new knowledge base for organizing and managing documents within your organization.<br><br>\n<b>Overview:</b><br>\nA knowledge base is a container for organizing related documents, files, and content. It provides a central location for teams to collaborate on shared information.<br><br>\n<b>Features:</b><br>\n<ul>\n<li>Hierarchical folder structure support</li>\n<li>Role-based access control (OWNER, ORGANIZER, WRITER, READER, etc.)</li>\n<li>Full-text search across all records</li>\n<li>Integration with external connectors (Google Drive, OneDrive, etc.)</li>\n<li>Automatic content indexing for AI-powered search</li>\n</ul>\n<b>Naming Rules:</b><br>\n<ul>\n<li>Name must be 1-255 characters</li>\n<li>Special characters and HTML tags are sanitized</li>\n<li>Names don't need to be unique within organization</li>\n</ul>\n<b>Creator Permissions:</b><br>\nThe user creating the KB automatically becomes the OWNER with full administrative rights.\n"
  },
  {
    "name": "knowledge-bases-list",
    "description": "List all knowledge bases\n\nRetrieve a paginated list of all knowledge bases accessible to the authenticated user.<br><br>\n<b>Overview:</b><br>\nReturns knowledge bases where the user has at least READER permission. Results include the user's role for each KB.<br><br>\n<b>Filtering:</b><br>\n<ul>\n<li><b>search:</b> Full-text search on KB names (max 1000 chars)</li>\n<li><b>permissions:</b> Filter by user's role (comma-separated: OWNER,WRITER,READER)</li>\n</ul>\n<b>Sorting Options:</b><br>\n<ul>\n<li><code>name</code> - Alphabetical by KB name</li>\n<li><code>createdAtTimestamp</code> - By creation date</li>\n<li><code>updatedAtTimestamp</code> - By last modification</li>\n<li><code>userRole</code> - By permission level</li>\n</ul>\n<b>Performance:</b><br>\nUses efficient pagination with limit/offset. For large result sets, use smaller page sizes.\n"
  },
  {
    "name": "knowledge-bases-get",
    "description": "Get knowledge base by ID\n\nRetrieve detailed information about a specific knowledge base.<br><br>\n<b>Overview:</b><br>\nReturns complete KB metadata including name, timestamps, and the requesting user's role/permissions.<br><br>\n<b>Access Control:</b><br>\nUser must have at least READER permission to view KB details.\n"
  },
  {
    "name": "knowledge-bases-update",
    "description": "Update knowledge base\n\nUpdate a knowledge base's name.<br><br>\n<b>Required Permission:</b> OWNER or ORGANIZER<br><br>\n<b>Validation:</b><br>\n<ul>\n<li>Name must be 1-255 characters</li>\n<li>XSS protection applied to input</li>\n</ul>\n"
  },
  {
    "name": "knowledge-bases-delete",
    "description": "Delete knowledge base\n\nPermanently delete a knowledge base and all its contents.<br><br>\n<b>Required Permission:</b> OWNER only<br><br>\n<b>What Gets Deleted:</b><br>\n<ul>\n<li>All folders within the KB</li>\n<li>All records and their indexed content</li>\n<li>All permission grants</li>\n<li>Associated storage files</li>\n</ul>\n<b>Warning:</b> This action is irreversible. Consider exporting data before deletion.\n"
  },
  {
    "name": "knowledge-bases-get-root-nodes",
    "description": "Get knowledge hub root nodes\n\nRetrieve root-level nodes for unified knowledge hub browsing.<br><br>\n<b>Overview:</b><br>\nProvides a unified view across all knowledge sources - KBs, connectors, and apps. Use for building file browser UIs.<br><br>\n<b>Node Types:</b><br>\n<ul>\n<li><b>KB:</b> Knowledge bases</li>\n<li><b>CONNECTOR:</b> External connector instances</li>\n<li><b>APP:</b> Connected applications</li>\n</ul>\n"
  },
  {
    "name": "knowledge-bases-get-child-nodes",
    "description": "Get knowledge hub child nodes\n\nRetrieve child nodes under a specific parent in the knowledge hub tree.<br><br>\n<b>Navigation:</b><br>\nUse this to drill down into KBs, folders, and connector hierarchies.\n"
  },
  {
    "name": "records-get-all",
    "description": "Get all records across knowledge bases\n\nRetrieve records from all knowledge bases accessible to the user.<br><br>\n<b>Overview:</b><br>\nSearch and filter records across your entire organization. Useful for global search, reporting, and cross-KB content discovery.<br><br>\n<b>Filtering Options:</b><br>\n<ul>\n<li><b>search:</b> Full-text search in record names</li>\n<li><b>recordTypes:</b> FILE, WEBPAGE, EMAIL, MESSAGE, TICKET, etc.</li>\n<li><b>origins:</b> UPLOAD or CONNECTOR</li>\n<li><b>connectors:</b> Filter by connector source</li>\n<li><b>indexingStatus:</b> COMPLETED, FAILED, IN_PROGRESS, etc.</li>\n<li><b>dateFrom/dateTo:</b> Filter by creation date range</li>\n</ul>\n<b>Response Includes:</b><br>\n<ul>\n<li>Paginated record list</li>\n<li>Applied and available filter counts</li>\n<li>Pagination metadata</li>\n</ul>\n"
  },
  {
    "name": "records-get",
    "description": "Get records for a knowledge base\n\nRetrieve a paginated list of records within a specific knowledge base.<br><br>\n<b>Overview:</b><br>\nReturns all records (documents, files, content) stored in the specified KB, with powerful filtering and sorting capabilities.<br><br>\n<b>Filtering:</b><br>\n<ul>\n<li><b>search:</b> Search by record name (partial match, max 1000 chars)</li>\n<li><b>recordTypes:</b> FILE, WEBPAGE, COMMENT, MESSAGE, EMAIL, TICKET</li>\n<li><b>origins:</b> UPLOAD (manual uploads) or CONNECTOR (synced)</li>\n<li><b>indexingStatus:</b> Filter by processing state</li>\n<li><b>dateFrom/dateTo:</b> Creation date range (Unix timestamps)</li>\n</ul>\n<b>Sorting:</b><br>\nDefault sorts by <code>createdAtTimestamp</code> descending (newest first).\n"
  },
  {
    "name": "records-get-by-id",
    "description": "Get record by ID\n\nRetrieve detailed information about a specific record.<br><br>\n<b>Overview:</b><br>\nReturns complete record metadata including name, type, indexing status, storage information, and version history.<br><br>\n<b>File Conversion:</b><br>\nUse the optional <code>convertTo</code> parameter to request file format conversion (e.g., PDF to text).\n"
  },
  {
    "name": "records-update",
    "description": "Update record\n\nUpdate a record's name and/or file content.<br><br>\n<b>Overview:</b><br>\nAllows updating the display name and optionally replacing the file content. Triggers re-indexing when content changes.<br><br>\n<b>Required Permission:</b> WRITER or higher<br><br>\n<b>Updating File Content:</b><br>\nInclude a new file in the request to replace the existing content. The file extension must match the original.<br><br>\n<b>Side Effects:</b><br>\n<ul>\n<li>Updates <code>updatedAtTimestamp</code></li>\n<li>Increments version if file content changed</li>\n<li>Triggers re-indexing for content changes</li>\n</ul>\n"
  },
  {
    "name": "records-delete",
    "description": "Delete record\n\nPermanently delete a record from the knowledge base.<br><br>\n<b>Required Permission:</b> WRITER or higher<br><br>\n<b>What Gets Deleted:</b><br>\n<ul>\n<li>Record metadata</li>\n<li>Associated storage file</li>\n<li>Indexed content and embeddings</li>\n</ul>\n<b>Warning:</b> This action is irreversible.\n"
  },
  {
    "name": "records-stream",
    "description": "Stream record content\n\nStream the binary content of a record's file.<br><br>\n<b>Overview:</b><br>\nReturns the raw file content with appropriate Content-Type and Content-Disposition headers for download or inline viewing.<br><br>\n<b>Use Cases:</b><br>\n<ul>\n<li>File downloads</li>\n<li>Inline document preview</li>\n<li>Content extraction pipelines</li>\n</ul>\n<b>Format Conversion:</b><br>\nUse <code>convertTo</code> parameter to convert between formats (e.g., DOCX to PDF).\n"
  },
  {
    "name": "records-move",
    "description": "Move a record to another folder\n\nMove a record (file or folder) to a different parent folder within the same knowledge base.<br><br>\n<b>Required Permission:</b> WRITER or higher<br><br>\n<b>Moving to Root:</b><br>\nSet <code>newParentId</code> to <code>null</code> to move the record to the root level of the knowledge base.\n"
  },
  {
    "name": "folders-create-root",
    "description": "Create root folder\n\nCreate a new folder at the root level of a knowledge base.<br><br>\n<b>Required Permission:</b> FILEORGANIZER or higher<br><br>\n<b>Folder Features:</b><br>\n<ul>\n<li>Organize records hierarchically</li>\n<li>Support nested subfolders</li>\n<li>Inherit parent KB permissions</li>\n</ul>\n<b>Naming Rules:</b><br>\n<ul>\n<li>1-255 characters</li>\n<li>XSS protection applied</li>\n<li>Can contain spaces and special characters</li>\n</ul>\n"
  },
  {
    "name": "folders-get-contents",
    "description": "Get folder contents\n\nRetrieve the contents of a folder including subfolders and records.<br><br>\n<b>Overview:</b><br>\nReturns paginated list of records within the folder, with same filtering options as KB-level record listing.<br><br>\n<b>Navigation:</b><br>\nUse this endpoint to browse folder hierarchies. Response includes folder metadata and child items.\n"
  },
  {
    "name": "folders-update",
    "description": "Update folder\n\nRename a folder.<br><br>\n<b>Required Permission:</b> FILEORGANIZER or higher\n"
  },
  {
    "name": "folders-delete",
    "description": "Delete folder\n\nDelete a folder and all its contents.<br><br>\n<b>Required Permission:</b> FILEORGANIZER or higher<br><br>\n<b>Cascade Delete:</b><br>\nAll subfolders and records within will be permanently deleted.<br><br>\n<b>Warning:</b> This action is irreversible.\n"
  },
  {
    "name": "folders-create-sub",
    "description": "Create subfolder\n\nCreate a nested folder within an existing folder.<br><br>\n<b>Required Permission:</b> FILEORGANIZER or higher<br><br>\n<b>Nesting:</b><br>\nSupports unlimited folder nesting depth for complex organizational structures.\n"
  },
  {
    "name": "upload-records",
    "description": "Upload files to knowledge base\n\nUpload one or more files directly to a knowledge base.<br><br>\n<b>Overview:</b><br>\nBatch upload multiple files in a single request. Each file becomes a new record in the KB with automatic content indexing.<br><br>\n<b>Upload Limits:</b><br>\n<ul>\n<li><b>Max files per request:</b> 1000</li>\n<li><b>Default max file size:</b> 30MB (configurable via platform settings)</li>\n<li>Use <code>GET /knowledgeBase/limits</code> to check current limits</li>\n</ul>\n<b>Supported File Types:</b><br>\nDocuments (PDF, DOCX, TXT), Images (PNG, JPG), Videos (MP4), and more.<br><br>\n<b>File Metadata:</b><br>\nUse <code>files_metadata</code> to provide additional info like file paths and last modified timestamps.<br><br>\n<b>Versioning:</b><br>\nSet <code>isVersioned: true</code> to enable version tracking for uploaded files.\n"
  },
  {
    "name": "upload-get-limits",
    "description": "Get upload limits\n\nRetrieve current upload constraints for the organization.<br><br>\n<b>Use Case:</b><br>\nCall this before uploads to validate file sizes on the client side and display appropriate limits to users.\n"
  },
  {
    "name": "uploads-to-folder",
    "description": "Upload files to folder\n\nUpload files directly to a specific folder within a knowledge base.<br><br>\n<b>Same as KB upload</b> but files are placed in the specified folder instead of KB root.\n"
  },
  {
    "name": "connectors-reindex-record",
    "description": "Reindex single record\n\nTrigger reindexing for a specific record.<br><br>\n<b>Overview:</b><br>\nReprocesses the record's content to update search indexes and AI embeddings. Useful after content changes or to fix indexing failures.<br><br>\n<b>Depth Parameter:</b><br>\nControls processing depth for complex documents (-1 for full depth, 0-100 for limited).\n"
  },
  {
    "name": "connector-reindex-record-group",
    "description": "Reindex record group\n\nTrigger reindexing for all records in a folder or knowledge base.<br><br>\n<b>Overview:</b><br>\nBatch reindex operation for entire containers. The recordGroupId can be a folder ID or KB ID.\n"
  },
  {
    "name": "connector-reindex-failed",
    "description": "Reindex failed connector records\n\nRetry indexing for all failed records from a specific connector.<br><br>\n<b>Use Case:</b><br>\nAfter fixing connectivity issues or configuration problems, use this to reprocess all records that failed during the initial sync.\n"
  },
  {
    "name": "connector-resync",
    "description": "Resync connector\n\nTrigger a full resync of all records from a connector.<br><br>\n<b>Overview:</b><br>\nFetches all content from the external source and updates local records. Use when you suspect data is out of sync.<br><br>\n<b>Warning:</b> This can be resource-intensive for large connectors.\n"
  },
  {
    "name": "connector-get-stats",
    "description": "Get connector statistics\n\nRetrieve statistics for a specific connector including record counts, indexing status breakdown, and sync information.\n"
  },
  {
    "name": "permissions-grant",
    "description": "Grant permissions\n\nGrant access permissions to users or teams for a knowledge base.<br><br>\n<b>Required Permission:</b> OWNER or ORGANIZER<br><br>\n<b>Permission Roles (highest to lowest):</b><br>\n<ol>\n<li><b>OWNER:</b> Full control, can delete KB, manage all permissions</li>\n<li><b>ORGANIZER:</b> Can manage permissions (except OWNER), edit KB settings</li>\n<li><b>FILEORGANIZER:</b> Can create/delete folders, organize content</li>\n<li><b>WRITER:</b> Can upload, edit, delete records</li>\n<li><b>COMMENTER:</b> Can add comments (if supported)</li>\n<li><b>READER:</b> View-only access</li>\n</ol>\n<b>Grant to Multiple:</b><br>\nProvide arrays of userIds and/or teamIds to grant the same role to multiple entities.\n"
  },
  {
    "name": "permissions-list",
    "description": "List permissions\n\nRetrieve all permissions granted on a knowledge base.<br><br>\n<b>Required Permission:</b> ORGANIZER or higher to see all permissions, others see only their own.\n"
  },
  {
    "name": "permissions-update",
    "description": "Update permissions\n\nUpdate permission roles for users or teams.<br><br>\n<b>Required Permission:</b> OWNER or ORGANIZER\n"
  },
  {
    "name": "permissions-delete",
    "description": "Remove permissions\n\nRemove access permissions from users or teams.<br><br>\n<b>Required Permission:</b> OWNER or ORGANIZER<br><br>\n<b>Note:</b> Cannot remove the last OWNER from a KB.\n"
  },
  {
    "name": "conversations-create",
    "description": "Create a new AI conversation\n\nStart a new conversation with PipesHub's AI assistant.<br><br>\n<b>Overview:</b><br>\nThis endpoint creates a new conversation session and processes the initial query.\nThe AI searches your organization's knowledge bases for relevant information and\ngenerates a response with citations to source documents.<br><br>\n<b>How It Works:</b><br>\n<ol>\n<li>Your query is analyzed and converted to semantic embeddings</li>\n<li>Relevant content is retrieved from indexed knowledge bases</li>\n<li>The AI generates a response using the retrieved context</li>\n<li>Citations link back to source documents for verification</li>\n<li>Follow-up questions are suggested based on the conversation</li>\n</ol>\n<b>Filtering Options:</b><br>\n<ul>\n<li><b>recordIds:</b> Limit search to specific documents</li>\n<li><b>filters.apps:</b> Search only specific connector apps</li>\n<li><b>filters.kb:</b> Search only specific knowledge bases</li>\n</ul>\n<b>Model Selection:</b><br>\nUse <code>modelKey</code> to select different AI models configured for your organization.\nEach model may have different capabilities, speed, and accuracy trade-offs.\n"
  },
  {
    "name": "conversations-list",
    "description": "List all conversations\n\nRetrieve all conversations for the authenticated user.<br><br>\n<b>Overview:</b><br>\nReturns a list of all conversations owned by or shared with the current user.\nConversations are returned with their messages, status, and metadata.<br><br>\n<b>Filtering:</b><br>\n<ul>\n<li>Only non-archived conversations are returned by default</li>\n<li>Use <code>/conversations/show/archives</code> for archived conversations</li>\n</ul>\n<b>Sorting:</b><br>\nConversations are sorted by last activity timestamp (most recent first).\n"
  },
  {
    "name": "conversations-get-archived",
    "description": "List archived conversations\n\nRetrieve all archived conversations for the authenticated user.<br><br>\n<b>Overview:</b><br>\nArchived conversations are hidden from the main list but preserved for reference.\nThis endpoint returns only conversations where <code>isArchived: true</code>.<br><br>\n<b>Unarchiving:</b><br>\nUse <code>PATCH /conversations/{id}/unarchive</code> to restore a conversation\nto the active list.\n"
  },
  {
    "name": "conversations-get-by-id",
    "description": "Get conversation by ID\n\nRetrieve a specific conversation with its full message history.<br><br>\n<b>Overview:</b><br>\nReturns the complete conversation including all messages, citations,\nfeedback, and metadata. Messages can be paginated for long conversations.<br><br>\n<b>Message Pagination:</b><br>\nFor conversations with many messages, use pagination parameters:\n<ul>\n<li><code>page</code>: Page number (default: 1)</li>\n<li><code>limit</code>: Messages per page (default: 10)</li>\n<li><code>sortBy</code>: Sort field (default: createdAt)</li>\n<li><code>sortOrder</code>: 'asc' or 'desc' (default: desc)</li>\n</ul>\n<b>Access Control:</b><br>\nUsers can access conversations they own or that have been shared with them.\n"
  },
  {
    "name": "conversations-delete",
    "description": "Delete conversation\n\nDelete a conversation by its ID.<br><br>\n<b>Overview:</b><br>\nPerforms a soft delete by setting <code>isDeleted: true</code>.\nThe conversation is removed from listings but preserved in the database.<br><br>\n<b>Permissions:</b><br>\nOnly the conversation owner (initiator) can delete it.\nShared users cannot delete conversations.\n"
  },
  {
    "name": "conversations-add-message",
    "description": "Add message to conversation\n\nAdd a follow-up message to an existing conversation.<br><br>\n<b>Overview:</b><br>\nContinues an existing conversation by adding a new user query.\nThe AI maintains context from previous messages when generating the response.<br><br>\n<b>Context Handling:</b><br>\n<ul>\n<li>Previous messages provide context for the new query</li>\n<li>Citations from earlier messages may be referenced</li>\n<li>The AI can refer back to previous topics discussed</li>\n</ul>\n<b>Model Override:</b><br>\nYou can specify a different model for this message using <code>modelKey</code>.\nThis allows switching models mid-conversation if needed.\n"
  },
  {
    "name": "conversations-share",
    "description": "Share conversation with users\n\nShare a conversation with other users in your organization.<br><br>\n<b>Overview:</b><br>\nAllows the conversation owner to grant access to other users.\nShared users can view the conversation and optionally add messages.<br><br>\n<b>Access Levels:</b><br>\n<ul>\n<li><code>read</code> - Can view conversation and messages (default)</li>\n<li><code>write</code> - Can view and add new messages</li>\n</ul>\n<b>Permissions:</b><br>\nOnly the conversation initiator (owner) can share. Users must belong\nto the same organization.\n"
  },
  {
    "name": "conversations-unshare",
    "description": "Revoke conversation access\n\nRemove sharing access from users.<br><br>\n<b>Overview:</b><br>\nRemoves specified users from the conversation's sharedWith list.\nThose users will no longer be able to access the conversation.<br><br>\n<b>Permissions:</b><br>\nOnly the conversation owner can revoke access.\n"
  },
  {
    "name": "conversations-update-title",
    "description": "Update conversation title\n\nUpdate the title of a conversation.<br><br>\n<b>Overview:</b><br>\nConversation titles are auto-generated from the first query by default.\nUse this endpoint to set a custom, more descriptive title.<br><br>\n<b>Title Limits:</b><br>\n<ul>\n<li>Minimum: 1 character</li>\n<li>Maximum: 200 characters</li>\n</ul>\n"
  },
  {
    "name": "conversations-archive",
    "description": "Archive conversation\n\nArchive a conversation to hide it from the main list.<br><br>\n<b>Overview:</b><br>\nArchived conversations are preserved but hidden from the default conversation list.\nUse archiving to clean up your workspace without permanently deleting conversations.<br><br>\n<b>Retrieval:</b><br>\nView archived conversations using <code>GET /conversations/show/archives</code>.\n"
  },
  {
    "name": "conversations-unarchive",
    "description": "Unarchive conversation\n\nRestore an archived conversation to the active list.<br><br>\n<b>Overview:</b><br>\nRemoves the archived flag, making the conversation visible in the main list again.\n"
  },
  {
    "name": "conversations-regenerate-message",
    "description": "Regenerate AI response\n\nRegenerate the AI response for a specific message.<br><br>\n<b>Overview:</b><br>\nIf you're not satisfied with an AI response, use this endpoint to generate\na new answer. The AI will re-process the original query and may produce\na different response.<br><br>\n<b>Use Cases:</b><br>\n<ul>\n<li>Response was incomplete or unclear</li>\n<li>Want to try a different AI model</li>\n<li>New documents have been indexed since original response</li>\n</ul>\n<b>Model Override:</b><br>\nSpecify <code>modelKey</code> to use a different model for regeneration.\n"
  },
  {
    "name": "conversations-update-feedback",
    "description": "Submit feedback on AI response\n\nProvide feedback on an AI-generated response.<br><br>\n<b>Overview:</b><br>\nFeedback helps improve AI response quality over time. You can rate\nvarious aspects of the response and provide detailed comments.<br><br>\n<b>Feedback Options:</b><br>\n<ul>\n<li><b>isHelpful:</b> Overall thumbs up/down</li>\n<li><b>ratings:</b> 1-5 scale for accuracy, relevance, completeness, clarity</li>\n<li><b>categories:</b> Issue categories (incorrect info, too verbose, etc.)</li>\n<li><b>comments:</b> Free-text positive/negative feedback and suggestions</li>\n<li><b>citationFeedback:</b> Rate individual citations</li>\n</ul>\n<b>Restrictions:</b><br>\nFeedback can only be submitted on <code>bot_response</code> messages,\nnot on user queries or system messages.\n"
  },
  {
    "name": "semantic-search-search",
    "description": "Perform semantic search\n\nExecute a semantic search across your organization's knowledge base.<br><br>\n<b>Overview:</b><br>\nSemantic search uses AI embeddings to find content based on meaning,\nnot just keyword matching. This enables finding relevant information\neven when the exact words differ.<br><br>\n<b>How It Works:</b><br>\n<ol>\n<li>Your query is converted to a vector embedding</li>\n<li>The system finds documents with similar semantic meaning</li>\n<li>Results are ranked by relevance score</li>\n<li>Matching chunks are returned with metadata</li>\n</ol>\n<b>Filtering:</b><br>\nUse filters to narrow your search:\n<ul>\n<li><code>filters.apps</code>: Limit to specific connector apps (Google Drive, Confluence, etc.)</li>\n<li><code>filters.kb</code>: Limit to specific knowledge bases</li>\n</ul>\n<b>Results:</b><br>\nEach result includes:\n<ul>\n<li>Matching content chunk</li>\n<li>Relevance score (0-1, higher is better)</li>\n<li>Source document metadata (name, URL, type)</li>\n</ul>\n<b>Search History:</b><br>\nAll searches are saved and can be retrieved via <code>GET /search</code>.\n"
  },
  {
    "name": "semantic-search-history",
    "description": "Get search history\n\nRetrieve your search history with pagination.<br><br>\n<b>Overview:</b><br>\nReturns a list of all searches performed by the authenticated user.\nEach entry includes the original query, results, and metadata.<br><br>\n<b>Pagination:</b><br>\nUse <code>page</code> and <code>limit</code> to navigate through results.\n"
  },
  {
    "name": "semantic-search-clear-history",
    "description": "Clear all search history\n\nDelete all search history for the authenticated user.<br><br>\n<b>Warning:</b><br>\nThis action cannot be undone. All saved searches will be permanently removed.\n"
  },
  {
    "name": "semantic-search-get-by-id",
    "description": "Get search by ID\n\nRetrieve a specific search result by its ID.<br><br>\n<b>Overview:</b><br>\nReturns the full search record including query, all results,\nand any sharing/archive status.\n"
  },
  {
    "name": "semantic-search-delete",
    "description": "Delete search\n\nDelete a specific search from history.<br><br>\n<b>Overview:</b><br>\nPermanently removes the search record from your history.\n"
  },
  {
    "name": "semantic-search-share",
    "description": "Share search results\n\nShare search results with other users.<br><br>\n<b>Overview:</b><br>\nAllows sharing a search and its results with colleagues.\nUseful for collaborative research or knowledge sharing.\n"
  },
  {
    "name": "semantic-search-unshare",
    "description": "Revoke search access\n\nRemove sharing access from specified users."
  },
  {
    "name": "semantic-search-archive",
    "description": "Archive search\n\nArchive a search to hide it from the main history list."
  },
  {
    "name": "semantic-search-unarchive",
    "description": "Unarchive search\n\nRestore an archived search to the active history list."
  },
  {
    "name": "agent-templates-list",
    "description": "List agent templates\n\nRetrieve all available agent templates.<br><br>\n<b>Overview:</b><br>\nAgent templates provide pre-configured starting points for creating\ncustom AI agents. Templates include system prompts, recommended tools,\nand configuration schemas.<br><br>\n<b>Template Types:</b><br>\n<ul>\n<li>Public templates available to all organization users</li>\n<li>Private templates created by individual users</li>\n</ul>\n"
  },
  {
    "name": "agent-templates-create",
    "description": "Create agent template\n\nCreate a new reusable agent template.<br><br>\n<b>Overview:</b><br>\nTemplates define the base configuration for agents including\nsystem prompts, tool recommendations, and customization options.<br><br>\n<b>Template Components:</b><br>\n<ul>\n<li><b>System prompt:</b> Default instructions for agents</li>\n<li><b>Recommended tools:</b> Suggested tool integrations</li>\n<li><b>Config schema:</b> JSON Schema for customization options</li>\n</ul>\n"
  },
  {
    "name": "agent-templates-get",
    "description": "Get agent template\n\nRetrieve a specific agent template by ID."
  },
  {
    "name": "agent-templates-update",
    "description": "Update agent template\n\nUpdate an existing agent template.<br><br>\n<b>Permissions:</b><br>\nOnly the template creator can update it.\n"
  },
  {
    "name": "agent-templates-delete",
    "description": "Delete agent template\n\nDelete an agent template.<br><br>\n<b>Note:</b><br>\nExisting agents created from this template are not affected.\n"
  },
  {
    "name": "agents-list",
    "description": "List agents\n\nRetrieve all agents available to the authenticated user.<br><br>\n<b>Overview:</b><br>\nReturns agents created by the user plus public agents in the organization.\nEach agent has unique capabilities defined by its tools and knowledge scope.\n"
  },
  {
    "name": "agents-create",
    "description": "Create agent\n\nCreate a new custom AI agent.<br><br>\n<b>Overview:</b><br>\nAgents are specialized AI assistants configured for specific tasks.\nThey can have custom system prompts, access to specific tools, and\nbe limited to certain knowledge bases.<br><br>\n<b>Agent Configuration:</b><br>\n<ul>\n<li><b>System prompt:</b> Instructions that define agent behavior</li>\n<li><b>Tools:</b> Capabilities like web search, code execution, etc.</li>\n<li><b>Knowledge bases:</b> Data sources the agent can access</li>\n<li><b>Model config:</b> AI model settings (temperature, max tokens)</li>\n</ul>\n<b>Use Cases:</b><br>\n<ul>\n<li>Customer support bot with product knowledge</li>\n<li>Code review assistant with repository access</li>\n<li>HR assistant with policy documents</li>\n</ul>\n"
  },
  {
    "name": "agents-list-tools",
    "description": "List available tools\n\nGet all tools that can be assigned to agents.<br><br>\n<b>Overview:</b><br>\nTools extend agent capabilities beyond basic Q&A. Each tool\nhas specific inputs and outputs defined by its schema.<br><br>\n<b>Common Tools:</b><br>\n<ul>\n<li><b>web-search:</b> Search the internet</li>\n<li><b>code-interpreter:</b> Execute code snippets</li>\n<li><b>file-reader:</b> Read uploaded files</li>\n<li><b>api-caller:</b> Make external API requests</li>\n</ul>\n"
  },
  {
    "name": "agents-get",
    "description": "Get agent\n\nRetrieve agent details by its unique key."
  },
  {
    "name": "agents-update",
    "description": "Update agent\n\nUpdate an existing agent's configuration.<br><br>\n<b>Permissions:</b><br>\nOnly the agent creator can update it.\n"
  },
  {
    "name": "agents-delete",
    "description": "Delete agent\n\nDelete an agent.<br><br>\n<b>Warning:</b><br>\nAll conversations with this agent will become inaccessible.\n"
  },
  {
    "name": "agents-get-permissions",
    "description": "Get agent permissions\n\nGet the current permission configuration for an agent."
  },
  {
    "name": "agents-update-permissions",
    "description": "Update agent permissions\n\nUpdate who can access and use the agent."
  },
  {
    "name": "agents-share",
    "description": "Share agent\n\nShare an agent with specific users."
  },
  {
    "name": "agents-unshare",
    "description": "Revoke agent access\n\nRemove sharing access from specified users."
  },
  {
    "name": "agent-conversations-list",
    "description": "List agent conversations\n\nGet all conversations with a specific agent.<br><br>\n<b>Overview:</b><br>\nReturns conversations the user has had with this particular agent.\nAgent conversations maintain the agent's context and capabilities.\n"
  },
  {
    "name": "agent-conversations-create",
    "description": "Create agent conversation\n\nStart a new conversation with an agent.<br><br>\n<b>Overview:</b><br>\nCreates a conversation using the agent's configuration including\nits system prompt, tools, and knowledge base access.\n"
  },
  {
    "name": "agent-conversations-get",
    "description": "Get agent conversation\n\nRetrieve a specific agent conversation by ID."
  },
  {
    "name": "agent-conversations-delete",
    "description": "Delete agent conversation\n\nDelete a conversation with an agent."
  },
  {
    "name": "agent-conversations-add-message",
    "description": "Add message to agent conversation\n\nAdd a follow-up message to an agent conversation."
  },
  {
    "name": "agent-conversations-regenerate-response",
    "description": "Regenerate agent response\n\nRegenerate the agent's response for a specific message.<br><br>\n<b>Overview:</b><br>\nSimilar to conversation regeneration but uses the agent's configuration.\n"
  },
  {
    "name": "connector-registry-list",
    "description": "List available connector types\n\nGet all available connector types from the registry.<br><br>\n<b>Overview:</b><br>\nThe registry contains all connector types that can be configured as instances.\nEach type has specific authentication requirements, supported scopes, and capabilities.<br><br>\n<b>Connector Types Include:</b><br>\n<ul>\n<li><b>Google Workspace:</b> Drive, Gmail, Calendar, etc.</li>\n<li><b>Microsoft 365:</b> OneDrive, Outlook, SharePoint, etc.</li>\n<li><b>Cloud Storage:</b> Dropbox, Box, AWS S3</li>\n<li><b>Collaboration:</b> Slack, Confluence, Notion, Jira</li>\n<li><b>Databases:</b> PostgreSQL, MySQL, MongoDB</li>\n</ul>\n<b>Filtering:</b><br>\nUse <code>scope</code> to filter by team or personal connectors.\nUse <code>search</code> for full-text search across connector names.\n"
  },
  {
    "name": "connector-registry-get-schema",
    "description": "Get connector configuration schema\n\nGet the configuration schema for a specific connector type.<br><br>\n<b>Overview:</b><br>\nReturns JSON Schema definitions for authentication, sync settings, and\nfilter options. Use this to dynamically build configuration forms.<br><br>\n<b>Schema Sections:</b><br>\n<ul>\n<li><b>authSchema:</b> Fields for authentication (credentials, tokens)</li>\n<li><b>syncSchema:</b> Sync settings (schedule, incremental options)</li>\n<li><b>filterSchema:</b> Filter field definitions</li>\n</ul>\n"
  },
  {
    "name": "connector-instances-list",
    "description": "List connector instances\n\nGet all configured connector instances for your organization.<br><br>\n<b>Overview:</b><br>\nReturns instances created by users, filtered by scope and permissions.\nTeam-scope connectors are visible to all org users. Personal connectors\nare only visible to their creators.<br><br>\n<b>Instance States:</b><br>\n<ul>\n<li><b>isConfigured:</b> All required settings are complete</li>\n<li><b>isAuthenticated:</b> OAuth flow complete or credentials valid</li>\n<li><b>isActive:</b> Connector is enabled for sync/agent</li>\n</ul>\n"
  },
  {
    "name": "connector-instances-create",
    "description": "Create connector instance\n\nCreate a new connector instance from a registry type.<br><br>\n<b>Overview:</b><br>\nCreates a new connector instance that can then be configured and enabled.\nThe instance is created in an unconfigured state and needs authentication\nand filter setup before it can be activated.<br><br>\n<b>Scope Permissions:</b><br>\n<ul>\n<li><code>team</code> scope requires admin privileges</li>\n<li><code>personal</code> scope available to all users</li>\n</ul>\n<b>Next Steps After Creation:</b><br>\n<ol>\n<li>Configure authentication via <code>PUT /{id}/config/auth</code></li>\n<li>Complete OAuth flow if needed via <code>GET /{id}/oauth/authorize</code></li>\n<li>Set up filters via <code>POST /{id}/filters</code></li>\n<li>Enable connector via <code>POST /{id}/toggle</code></li>\n</ol>\n"
  },
  {
    "name": "connector-instances-list-active",
    "description": "List active connector instances\n\nGet all active (enabled) connector instances.<br><br>\n<b>Overview:</b><br>\nReturns only instances where <code>isActive: true</code>.\nThese are connectors currently syncing data or available to AI agents.\n"
  },
  {
    "name": "connector-instances-list-inactive",
    "description": "List inactive connector instances\n\nGet all inactive (disabled) connector instances."
  },
  {
    "name": "connector-instances-list-configured",
    "description": "List configured connector instances\n\nGet all connector instances that have completed configuration.<br><br>\n<b>Overview:</b><br>\nReturns instances where <code>isConfigured: true</code>.\nThese have all required settings but may not be active yet.\n"
  },
  {
    "name": "connector-instances-list-active-agents",
    "description": "List active agent connectors\n\nGet connector instances enabled for AI agent integration.<br><br>\n<b>Overview:</b><br>\nReturns connectors where <code>agentEnabled: true</code>.\nThese are available to AI agents for querying and actions.\n"
  },
  {
    "name": "connector-instances-get",
    "description": "Get connector instance\n\nRetrieve a specific connector instance by ID."
  },
  {
    "name": "connector-instances-delete",
    "description": "Delete connector instance\n\nDelete a connector instance and all associated data.<br><br>\n<b>Warning:</b><br>\nThis permanently removes the connector configuration.\nSynced records in knowledge bases are NOT deleted.<br><br>\n<b>Permissions:</b><br>\n<ul>\n<li>Team scope: Requires admin</li>\n<li>Personal scope: Only creator can delete</li>\n</ul>\n"
  },
  {
    "name": "connector-instances-update-name",
    "description": "Update connector instance name\n\nUpdate the display name of a connector instance.<br><br>\n<b>Note:</b> This only updates the display name, not the connector configuration.\n"
  },
  {
    "name": "connector-configuration-get",
    "description": "Get connector configuration\n\nGet the current configuration for a connector instance.<br><br>\n<b>Security:</b><br>\nSensitive data (credentials, OAuth tokens) are redacted from the response.\nOnly admins can see partial credential information.\n"
  },
  {
    "name": "connector-configuration-update-connector-config",
    "description": "Update connector configuration\n\nUpdate authentication, sync, and filter configuration.<br><br>\n<b>Prerequisites:</b><br>\nConnector must be <b>disabled</b> before updating configuration.\nDisable it first using <code>POST /{id}/toggle</code>.<br><br>\n<b>Partial Updates:</b><br>\nOnly provide the sections you want to update. Omitted sections\nare not modified.\n"
  },
  {
    "name": "connector-configuration-update-auth-config",
    "description": "Update authentication configuration\n\nUpdate only the authentication configuration.<br><br>\n<b>Use Case:</b><br>\nUse this when you need to update credentials without changing\nsync or filter settings. Useful for credential rotation.<br><br>\n<b>Prerequisites:</b><br>\nConnector must be disabled. This endpoint clears OAuth state,\nrequiring re-authentication for OAuth connectors.\n"
  },
  {
    "name": "connector-configuration-update-filters-sync",
    "description": "Update filters and sync configuration\n\nUpdate filter selections and sync settings without touching auth.<br><br>\n<b>Use Case:</b><br>\nUse this to change what data is synced or adjust sync schedule\nwithout re-authenticating.\n"
  },
  {
    "name": "connector-control-toggle",
    "description": "Toggle connector sync or agent\n\nEnable or disable a connector for sync or agent functionality.<br><br>\n<b>Toggle Types:</b><br>\n<ul>\n<li><code>sync</code> - Enable/disable data synchronization</li>\n<li><code>agent</code> - Enable/disable AI agent integration</li>\n</ul>\n<b>Prerequisites for Enabling:</b><br>\n<ul>\n<li>Connector must be configured (<code>isConfigured: true</code>)</li>\n<li>For OAuth connectors: Must be authenticated (<code>isAuthenticated: true</code>)</li>\n<li>For agent: Connector must support agent (<code>supportsAgent: true</code>)</li>\n</ul>\n<b>Permissions:</b><br>\n<ul>\n<li>Team scope: Requires admin</li>\n<li>Personal scope: Only creator can toggle</li>\n</ul>\n"
  },
  {
    "name": "connector-O-auth-get-token-from-code",
    "description": "Exchange authorization code for tokens (legacy)\n\nExchange a Google Workspace authorization code for access and refresh tokens.<br><br>\n<b>Note:</b> This is a legacy endpoint specific to Google Workspace connectors.\nFor new integrations, use the standard OAuth flow via\n<code>/connectors/{connectorId}/oauth/authorize</code> and the callback.<br><br>\n<b>Flow:</b><br>\n<ol>\n<li>User completes Google Workspace OAuth consent in the browser</li>\n<li>Browser receives authorization code</li>\n<li>Frontend sends the code to this endpoint</li>\n<li>Backend exchanges code for tokens and stores them</li>\n</ol>\n<b>Admin Only:</b> Requires admin privileges.\n"
  },
  {
    "name": "connector-O-auth-get-authorization-url",
    "description": "Get OAuth authorization URL\n\nGenerate an OAuth authorization URL to start the OAuth flow.<br><br>\n<b>Flow:</b><br>\n<ol>\n<li>Call this endpoint to get the authorization URL</li>\n<li>Redirect user's browser to the URL</li>\n<li>User authenticates with the provider</li>\n<li>Provider redirects to callback with authorization code</li>\n<li>Callback exchanges code for tokens automatically</li>\n</ol>\n<b>State Parameter:</b><br>\nThe response includes a <code>state</code> value that encodes the\nconnector ID. This is validated in the callback.\n"
  },
  {
    "name": "connector-O-auth-handle-callback",
    "description": "OAuth callback handler\n\nHandle the OAuth callback from the identity provider.<br><br>\n<b>Note:</b><br>\nThis endpoint is called by the OAuth provider after user authentication.\nThe state parameter contains the encoded connector ID.<br><br>\n<b>Success:</b><br>\nOn success, tokens are stored and the connector becomes authenticated.\nUser is redirected to the frontend success page.<br><br>\n<b>Error:</b><br>\nIf the provider returns an error (e.g., user denied access),\nuser is redirected with error information.\n"
  },
  {
    "name": "connector-filters-get",
    "description": "Get filter options\n\nGet available filter options for a connector.<br><br>\n<b>Overview:</b><br>\nReturns filter fields that can be used to limit what data is synced.\nFor example, a Google Drive connector might offer filters for\nspecific folders or file types.<br><br>\n<b>Dynamic Filters:</b><br>\nSome filter fields have <code>dynamic: true</code>, meaning their\noptions are loaded separately via the filter options endpoint.\n"
  },
  {
    "name": "connector-filters-save",
    "description": "Save filter selections\n\nSave the user's filter selections for a connector.<br><br>\n<b>Overview:</b><br>\nAfter viewing filter options, use this endpoint to save the\nselected values. These determine what data will be synced.\n"
  },
  {
    "name": "connector-filters-get-options",
    "description": "Get dynamic filter options\n\nGet options for a dynamic filter field with pagination.<br><br>\n<b>Overview:</b><br>\nFor filters with <code>dynamic: true</code>, options are loaded\nfrom the connected service. This supports pagination and search.<br><br>\n<b>Examples:</b><br>\n<ul>\n<li>Google Drive folders list</li>\n<li>Slack channels list</li>\n<li>Confluence spaces list</li>\n</ul>\n"
  },
  {
    "name": "oauth-configuration-get-registry",
    "description": "List OAuth-capable connector types\n\nGet all connector types that support OAuth authentication.<br><br>\n<b>Admin Use:</b><br>\nAdmins use this to see which connector types need OAuth credentials\nto be configured before users can authenticate.\n"
  },
  {
    "name": "oauth-configuration-list",
    "description": "List OAuth configurations\n\nList all OAuth configurations for the organization.<br><br>\n<b>Security:</b><br>\n<ul>\n<li>Admins see full configuration including credentials</li>\n<li>Non-admins see only essential fields (client ID, not secret)</li>\n</ul>\n"
  },
  {
    "name": "oauth-configuration-list-by-type",
    "description": "List OAuth configs for connector type\n\nGet all OAuth configurations for a specific connector type."
  },
  {
    "name": "oauth-configuration-create",
    "description": "Create OAuth configuration\n\nCreate a new OAuth configuration for a connector type.<br><br>\n<b>Admin Only:</b><br>\nOnly admins can create OAuth configurations. These provide the\nOAuth credentials needed for users to authenticate connectors.<br><br>\n<b>Use Case:</b><br>\nBefore users can create Google Drive connectors with OAuth,\nan admin must create an OAuth configuration with the Google\nOAuth client ID and secret.\n"
  },
  {
    "name": "oauth-configuration-get",
    "description": "Get OAuth configuration\n\nGet a specific OAuth configuration by ID."
  },
  {
    "name": "oauth-configuration-update",
    "description": "Update OAuth configuration\n\nUpdate an OAuth configuration.<br><br>\n<b>Admin Only:</b><br>\nOnly the creator or another admin can update.\n"
  },
  {
    "name": "oauth-configuration-delete",
    "description": "Delete OAuth configuration\n\nDelete an OAuth configuration.<br><br>\n<b>Warning:</b><br>\nCannot delete if the configuration is used by active connectors.\nDisable or delete dependent connectors first.\n"
  },
  {
    "name": "o-auth-configurations-get-connector-type",
    "description": "Get OAuth connector type details\n\nGet details for a specific OAuth-capable connector type."
  },
  {
    "name": "storage-configuration-create-local",
    "description": "Configure Local Storage\n\nConfigure local filesystem as the storage backend for file uploads and document storage. Suitable for development or on-premise deployments."
  },
  {
    "name": "storage-configuration-create-s3",
    "description": "Configure AWS S3 Storage\n\nConfigure AWS S3 as the storage backend for file uploads and document storage. Requires an S3 bucket and IAM credentials with appropriate permissions."
  },
  {
    "name": "storage-configurations-create-azure-blob",
    "description": "Configure Azure Blob Storage\n\nConfigure Azure Blob Storage as the storage backend. You can provide either:\n- A full connection string (azureBlobConnectionString), OR\n- Individual credentials (accountName, accountKey, endpointProtocol, endpointSuffix)\n"
  },
  {
    "name": "storage-configurations-get",
    "description": "Get current storage configuration\n\nRetrieve the current storage backend configuration. Returns the configuration for whichever storage type is currently active (Local, S3, or Azure Blob)."
  },
  {
    "name": "smtp-configurations-create",
    "description": "Create or update SMTP configuration\n\nConfigure SMTP email server for sending system emails including user invitations, notifications, and password resets.\n\nCommon SMTP providers and their settings:\n- Gmail: host=smtp.gmail.com, port=587 (requires App Password)\n- SendGrid: host=smtp.sendgrid.net, port=587\n- Amazon SES: host=email-smtp.{region}.amazonaws.com, port=587\n- Microsoft 365: host=smtp.office365.com, port=587\n\nConfiguration is encrypted before storage.\n"
  },
  {
    "name": "smtp-configuration-get",
    "description": "Get SMTP configuration\n\nRetrieve the current SMTP server configuration. Password is included in the response for admin users."
  },
  {
    "name": "authentication-configuration-set-azure-ad-auth-a00",
    "description": "Configure Azure AD authentication\n\nSet up Azure Active Directory as an authentication provider for user login."
  },
  {
    "name": "authentication-configuration-get-azure-ad",
    "description": "Get Azure AD configuration\n\nRetrieve Azure AD authentication configuration."
  },
  {
    "name": "authentication-configuration-get-microsoft-auth-9dc",
    "description": "Get Microsoft authentication configuration\n\nGet Microsoft authentication configuration."
  },
  {
    "name": "authentication-configuration-configure-google-auth",
    "description": "Configure Google authentication\n\nSet up Google OAuth as an authentication provider."
  },
  {
    "name": "authentication-configuration-get-google-auth-config",
    "description": "Get Google authentication configuration\n\nGet Google authentication configuration."
  },
  {
    "name": "authentication-configuration-configure-sso",
    "description": "Configure SAML SSO authentication\n\nSet up SAML 2.0 Single Sign-On with your identity provider (Okta, OneLogin, etc.)."
  },
  {
    "name": "authentication-configuration-get-sso",
    "description": "Get SAML SSO configuration\n\nGet SAML SSO configuration."
  },
  {
    "name": "authentication-configuration-set-O-auth",
    "description": "Configure generic OAuth provider\n\nSet up a custom OAuth 2.0 authentication provider."
  },
  {
    "name": "authentication-configuration-get-generic-O-auth-5dc",
    "description": "Get generic OAuth configuration\n\nGet generic OAuth configuration."
  },
  {
    "name": "authentication-configurations-set-microsoft",
    "description": "Configure Microsoft authentication\n\nSet up Microsoft account as an authentication provider."
  },
  {
    "name": "ai-models-configuration-create",
    "description": "Bulk create AI models configuration\n\nConfigure multiple AI model providers at once. Performs health checks on each model before saving. Use this for initial setup - for individual model management, use /ai-models/providers endpoints."
  },
  {
    "name": "ai-models-configuration-get",
    "description": "Get all AI models configuration\n\nRetrieve all configured AI model providers grouped by type."
  },
  {
    "name": "ai-models-providers-list",
    "description": "Get all AI model providers\n\nList all configured AI model providers with their configurations."
  },
  {
    "name": "ai-models-providers-get-by-type",
    "description": "Get models by type\n\nGet all configured models of a specific type."
  },
  {
    "name": "ai-models-providers-get-available-models-by-type",
    "description": "Get available models for selection\n\nGet available models in a flattened format for UI selection dropdowns."
  },
  {
    "name": "ai-models-providers-add-provider",
    "description": "Add new AI model provider\n\nAdd a new AI model provider configuration. Performs a health check before saving to verify connectivity. Supported providers: openai, anthropic, azure-openai, aws-bedrock, google-vertex, ollama, huggingface."
  },
  {
    "name": "ai-models-providers-update",
    "description": "Update AI model provider\n\nUpdate an existing AI model provider configuration."
  },
  {
    "name": "ai-models-providers-delete",
    "description": "Delete AI model provider\n\nRemove an AI model provider configuration. Cannot delete the default model if it's the only one."
  },
  {
    "name": "ai-models-providers-set-default",
    "description": "Set default AI model\n\nSet a model as the default for its type."
  },
  {
    "name": "connector-O-auth-configuration-create-google-eb2",
    "description": "Upload Google Workspace credentials\n\nUpload Google Workspace credentials (service account JSON for business, or OAuth tokens for individual users). File must be valid JSON."
  },
  {
    "name": "connector-O-auth-configuration-set-google-9fb",
    "description": "Configure Google Workspace OAuth\n\nSet up OAuth credentials for Google Workspace connector. Required for user authentication with Google Drive, Gmail, etc."
  },
  {
    "name": "connector-O-auth-configuration-set-atlassian-config",
    "description": "Configure Atlassian OAuth\n\nSet up OAuth credentials for Atlassian (Confluence/Jira) connector."
  },
  {
    "name": "connector-O-auth-configuration-get-atlassian",
    "description": "Get Atlassian OAuth configuration\n\nGet Atlassian OAuth configuration."
  },
  {
    "name": "connector-O-auth-configuration-set-one-drive-config",
    "description": "Configure OneDrive connector\n\nSet up Microsoft credentials for OneDrive connector."
  },
  {
    "name": "connector-O-auth-configuration-get-one-drive-config",
    "description": "Get OneDrive configuration\n\nGet OneDrive configuration."
  },
  {
    "name": "connector-O-auth-configuration-set-share-point-cf2",
    "description": "Configure SharePoint connector\n\nSet up Microsoft credentials for SharePoint connector."
  },
  {
    "name": "connector-O-auth-configuration-get-sharepoint-config",
    "description": "Get SharePoint configuration\n\nGet SharePoint configuration."
  },
  {
    "name": "connector-configurations-get-google-workspace-abc",
    "description": "Get Google Workspace credentials status\n\nCheck if Google Workspace credentials are configured."
  },
  {
    "name": "connector-oauth-configuration-get-google-workspace",
    "description": "Get Google Workspace OAuth configuration\n\nGet Google Workspace OAuth configuration."
  },
  {
    "name": "public-urls-set-frontend",
    "description": "Set frontend public URL\n\nConfigure the public URL where the frontend application is accessible. Used for OAuth redirects and email links."
  },
  {
    "name": "public-urls-get-frontend",
    "description": "Get frontend public URL\n\nGet frontend public URL."
  },
  {
    "name": "public-urls-set",
    "description": "Set connector public URL\n\nConfigure the public URL for connector OAuth callbacks."
  },
  {
    "name": "public-urls-get-connector",
    "description": "Get connector public URL\n\nGet connector public URL."
  },
  {
    "name": "platform-settings-update",
    "description": "Update platform settings\n\nConfigure platform-wide settings including file upload limits and feature flags.\n\n**File Upload Limits:**\n- Default: 30MB (31457280 bytes)\n- Maximum: 1GB (1073741824 bytes)\n\n**Available Feature Flags:**\n- ENABLE_BETA_CONNECTORS: Enable beta connector integrations (default: false)\n"
  },
  {
    "name": "platform-settings-get",
    "description": "Get platform settings\n\nRetrieve current platform settings including file upload limits and feature flag states."
  },
  {
    "name": "platform-settings-get-available-feature-flags",
    "description": "Get available feature flags\n\nList all available feature flags with their descriptions and default values."
  },
  {
    "name": "platform-settings-set-custom-system-prompt",
    "description": "Update custom system prompt\n\nSet a custom system prompt that will be used by AI models."
  },
  {
    "name": "platform-settings-get-custom-system-prompt",
    "description": "Get custom system prompt\n\nGet custom system prompt."
  },
  {
    "name": "metrics-collection-get",
    "description": "Get metrics collection configuration\n\nRetrieve the current metrics collection configuration including:\n- Whether collection is enabled\n- Push interval settings\n- Server URL configuration\n- Instance identification\n\n**Admin Access Required:** This endpoint requires administrator privileges.\n"
  },
  {
    "name": "metrics-collection-toggle",
    "description": "Enable or disable metrics collection\n\nToggle the master switch for metrics collection.\n\n**When Enabled:**\n- Application metrics are collected in the background\n- Metrics are pushed to the configured server at regular intervals\n- Activity counters track API usage patterns\n\n**When Disabled:**\n- No metrics are collected or stored\n- No data is sent to the metrics server\n- Existing scheduled push jobs are stopped\n\n**Admin Access Required:** This endpoint requires administrator privileges.\n"
  },
  {
    "name": "metrics-collection-set-push-interval",
    "description": "Configure metrics push interval\n\nSet how frequently collected metrics are pushed to the remote server.\n\n**Interval Guidelines:**\n- Minimum: 1000ms (1 second) - for real-time monitoring\n- Recommended: 60000ms (1 minute) - balanced performance\n- Maximum: No hard limit, but longer intervals may delay insights\n\n**Performance Considerations:**\n- Shorter intervals provide more real-time data but increase network traffic\n- Longer intervals reduce overhead but delay metric visibility\n- Changes take effect on the next push cycle\n\n**Admin Access Required:** This endpoint requires administrator privileges.\n"
  },
  {
    "name": "metrics-collection-configure-server-url",
    "description": "Configure metrics server URL\n\nSet the remote server URL where metrics will be pushed.\n\n**Use Cases:**\n- Self-hosted analytics: Point to your own Prometheus-compatible endpoint\n- Custom monitoring: Integrate with your organization's monitoring stack\n- Development: Use a local endpoint for testing\n\n**URL Requirements:**\n- Must be a valid URL (http or https)\n- Server must accept POST requests with JSON payload\n- Server should return 2xx status for successful pushes\n\n**Admin Access Required:** This endpoint requires administrator privileges.\n"
  },
  {
    "name": "crawling-jobs-schedule",
    "description": "Schedule a crawling job\n\nSchedule a new crawling job for a specific connector instance.<br><br>\n\n<b>Overview:</b><br>\nCreates a scheduled crawling job that will sync data from the specified connector into\nPipesHub's search index. The job is added to a BullMQ queue and will execute according\nto the specified schedule configuration.<br><br>\n\n<b>Schedule Types:</b><br>\n<ul>\n<li><b>hourly:</b> Run every X hours at specified minute (e.g., every 2 hours at :30)</li>\n<li><b>daily:</b> Run once per day at specified time (e.g., 2:00 AM daily)</li>\n<li><b>weekly:</b> Run on specific days of the week (e.g., Mon/Wed/Fri at 3:00 AM)</li>\n<li><b>monthly:</b> Run on specific day of month (e.g., 1st of each month at 4:00 AM)</li>\n<li><b>custom:</b> Use cron expression for complex schedules</li>\n<li><b>once:</b> Run once at a specific future datetime</li>\n</ul>\n\n<b>Access Control:</b><br>\n<ul>\n<li>Team-scoped connectors: Requires admin privileges</li>\n<li>Personal-scoped connectors: Only the creator can schedule jobs</li>\n</ul>\n\n<b>Job Behavior:</b><br>\n<ul>\n<li>If a job already exists for this connector, it will be replaced</li>\n<li>Disabled schedules (<code>isEnabled: false</code>) will throw an error</li>\n<li>Jobs use exponential backoff for retries (5s, 10s, 20s, etc.)</li>\n<li>Only last 10 completed/failed jobs are retained per connector</li>\n</ul>\n\n<b>Related Endpoints:</b><br>\n<ul>\n<li><code>GET /crawlingManager/{connector}/{connectorId}/schedule</code> - Get job status</li>\n<li><code>POST /crawlingManager/{connector}/{connectorId}/pause</code> - Pause job</li>\n<li><code>DELETE /crawlingManager/{connector}/{connectorId}/remove</code> - Remove job</li>\n</ul>\n"
  },
  {
    "name": "crawling-jobs-get-status",
    "description": "Get crawling job status\n\nRetrieve the current status of a scheduled crawling job for a specific connector.<br><br>\n\n<b>Overview:</b><br>\nReturns detailed information about the most recent crawling job for the specified connector,\nincluding its current state, progress, timing information, and any error details.<br><br>\n\n<b>Job States:</b><br>\n<ul>\n<li><b>waiting:</b> Job is queued and waiting to be processed</li>\n<li><b>active:</b> Job is currently being processed by a worker</li>\n<li><b>completed:</b> Job finished successfully</li>\n<li><b>failed:</b> Job failed after exhausting retry attempts</li>\n<li><b>delayed:</b> Job is scheduled for future execution</li>\n<li><b>paused:</b> Job has been manually paused</li>\n</ul>\n\n<b>Access Control:</b><br>\nSame as scheduling - team connectors require admin, personal connectors require creator.\n"
  },
  {
    "name": "crawling-jobs-remove",
    "description": "Remove a crawling job\n\nPermanently remove a scheduled crawling job for a specific connector.<br><br>\n\n<b>Overview:</b><br>\nRemoves the crawling job and all associated data from the queue. This includes\nremoving repeatable job configurations and cleaning up job history.<br><br>\n\n<b>What Gets Removed:</b><br>\n<ul>\n<li>Active or waiting job instances</li>\n<li>Repeatable job configuration (for recurring schedules)</li>\n<li>Paused job information</li>\n<li>Job mappings and metadata</li>\n</ul>\n\n<b>Note:</b> Completed and failed job records may be retained for audit purposes.\n\n<b>Related Endpoints:</b><br>\n<ul>\n<li><code>DELETE /crawlingManager/schedule/all</code> - Remove all jobs for organization</li>\n</ul>\n"
  },
  {
    "name": "crawling-jobs-pause",
    "description": "Pause a crawling job\n\nPause a running or scheduled crawling job without losing its configuration.<br><br>\n\n<b>Overview:</b><br>\nPausing a job stores its complete configuration and removes it from the active queue.\nThe job can be resumed later with <code>POST /crawlingManager/{connector}/{connectorId}/resume</code>,\nwhich will restore the exact same schedule configuration.<br><br>\n\n<b>How Pausing Works:</b><br>\n<ol>\n<li>Current job configuration is stored in memory</li>\n<li>Active/repeatable job is removed from BullMQ queue</li>\n<li>Job state changes to \"paused\"</li>\n<li>No new job executions will occur until resumed</li>\n</ol>\n\n<b>Use Cases:</b><br>\n<ul>\n<li>Temporarily stop crawling during maintenance</li>\n<li>Pause data sync while investigating issues</li>\n<li>Stop crawling for a connector being reconfigured</li>\n</ul>\n\n<b>Note:</b> If a job is currently active (processing), it will complete before pausing.\n"
  },
  {
    "name": "crawling-jobs-resume",
    "description": "Resume a paused crawling job\n\nResume a previously paused crawling job using its stored configuration.<br><br>\n\n<b>Overview:</b><br>\nRestores a paused job to active state using the exact configuration it had when paused.\nA new job is created in BullMQ with the same schedule settings.<br><br>\n\n<b>How Resuming Works:</b><br>\n<ol>\n<li>Retrieve stored job configuration from pause state</li>\n<li>Create new scheduled job with same configuration</li>\n<li>Remove from paused jobs tracking</li>\n<li>Job will execute according to its original schedule</li>\n</ol>\n\n<b>Note:</b> The job will resume according to its schedule, not immediately execute\n(unless it's a one-time job that hasn't run yet).\n"
  },
  {
    "name": "crawling-jobs-get-all-status",
    "description": "Get all crawling job statuses\n\nRetrieve the status of all scheduled crawling jobs for the current organization.<br><br>\n\n<b>Overview:</b><br>\nReturns a list of all crawling jobs across all connectors for the authenticated user's\norganization. This includes active, waiting, paused, completed, and failed jobs.<br><br>\n\n<b>Response Details:</b><br>\n<ul>\n<li>Jobs are grouped by connector type</li>\n<li>Last 10 jobs per connector type are returned</li>\n<li>Includes both active queue jobs and paused jobs</li>\n</ul>\n\n<b>Use Cases:</b><br>\n<ul>\n<li>Dashboard overview of all crawling activities</li>\n<li>Monitoring job health across connectors</li>\n<li>Identifying failed or stuck jobs</li>\n</ul>\n"
  },
  {
    "name": "crawling-jobs-remove-all",
    "description": "Remove all crawling jobs\n\nRemove all scheduled crawling jobs for the current organization.<br><br>\n\n<b>Overview:</b><br>\nBulk operation to remove all crawling jobs across all connectors for the organization.\nThis is useful when decommissioning an organization or doing a complete reset.<br><br>\n\n<b>What Gets Removed:</b><br>\n<ul>\n<li>All active and waiting jobs</li>\n<li>All repeatable job configurations</li>\n<li>All paused jobs</li>\n<li>All job mappings for the organization</li>\n</ul>\n\n<b>Warning:</b> This operation cannot be undone. All job configurations will need\nto be recreated manually.\n"
  },
  {
    "name": "queue-management-get-stats",
    "description": "Get queue statistics\n\nRetrieve aggregate statistics about the crawling job queue.<br><br>\n\n<b>Overview:</b><br>\nReturns real-time statistics about the BullMQ queue including job counts by state,\npaused jobs, and repeatable job configurations. Useful for monitoring system health\nand capacity planning.<br><br>\n\n<b>Statistics Included:</b><br>\n<ul>\n<li><b>waiting:</b> Jobs queued and waiting to be processed</li>\n<li><b>active:</b> Jobs currently being processed by workers</li>\n<li><b>completed:</b> Successfully completed jobs (limited retention)</li>\n<li><b>failed:</b> Failed jobs (limited retention)</li>\n<li><b>delayed:</b> Jobs scheduled for future execution</li>\n<li><b>paused:</b> Manually paused jobs</li>\n<li><b>repeatable:</b> Number of repeatable job configurations</li>\n<li><b>total:</b> Sum of all job counts</li>\n</ul>\n\n<b>Use Cases:</b><br>\n<ul>\n<li>Monitor queue health and throughput</li>\n<li>Identify processing bottlenecks</li>\n<li>Track failed job counts for alerting</li>\n<li>Capacity planning based on queue depth</li>\n</ul>\n"
  },
  {
    "name": "query-service-health",
    "description": "[Query Service] Health check\n\n⚠️ <b>INTERNAL SERVICE ENDPOINT</b><br><br>\n\nHealth check endpoint for the Query Service (Python FastAPI).<br><br>\n\n<b>Service:</b> Query Service<br>\n<b>Port:</b> 8000<br>\n<b>Base URL:</b> <code>http://localhost:8000</code><br><br>\n\n<b>Authentication:</b> None required for health check<br><br>\n\n<b>Note:</b> This is an internal service health endpoint. It also verifies\nconnectivity to the Connector Service as a dependency check.\n"
  },
  {
    "name": "query-service-search",
    "description": "[Query Service] Semantic search\n\n⚠️ <b>INTERNAL SERVICE ENDPOINT</b><br><br>\n\nPerform semantic search across indexed documents using vector embeddings.<br><br>\n\n<b>Service:</b> Query Service<br>\n<b>Port:</b> 8000<br>\n<b>Base URL:</b> <code>http://localhost:8000</code><br><br>\n\n<b>Authentication:</b> Requires user JWT token (proxied from main API) or scoped service token<br><br>\n\n<b>How It Works:</b><br>\n<ol>\n<li>Query is transformed and expanded using LLM</li>\n<li>Embeddings are generated for search queries</li>\n<li>Vector similarity search in Qdrant</li>\n<li>Results filtered by user permissions</li>\n<li>Optional knowledge base filtering</li>\n</ol>\n"
  },
  {
    "name": "query-service-chat",
    "description": "[Query Service] Chat with knowledge base\n\n⚠️ <b>INTERNAL SERVICE ENDPOINT</b><br><br>\n\nConversational AI endpoint with RAG (Retrieval-Augmented Generation).<br><br>\n\n<b>Service:</b> Query Service<br>\n<b>Port:</b> 8000<br>\n<b>Base URL:</b> <code>http://localhost:8000</code><br><br>\n\n<b>Authentication:</b> Requires user JWT token (proxied from main API) or scoped service token<br><br>\n\n<b>Features:</b><br>\n<ul>\n<li>Multi-turn conversation support</li>\n<li>Context from knowledge base</li>\n<li>Citation of source documents</li>\n<li>Multiple chat modes (quick, analysis, deep_research, creative, precise)</li>\n<li>Multi-model support (OpenAI, Anthropic, Ollama, etc.)</li>\n</ul>\n"
  },
  {
    "name": "query-service-stream-chat",
    "description": "[Query Service] Streaming chat with knowledge base\n\n⚠️ <b>INTERNAL SERVICE ENDPOINT</b><br><br>\n\nStreaming conversational AI endpoint with real-time token delivery.<br><br>\n\n<b>Service:</b> Query Service<br>\n<b>Port:</b> 8000<br>\n<b>Base URL:</b> <code>http://localhost:8000</code><br><br>\n\n<b>Authentication:</b> Requires user JWT token (proxied from main API) or scoped service token<br><br>\n\n<b>SSE Events:</b><br>\n<ul>\n<li><code>status</code>: Processing status updates</li>\n<li><code>chunk</code>: Token/text chunks</li>\n<li><code>citations</code>: Source citations</li>\n<li><code>done</code>: Stream complete</li>\n<li><code>error</code>: Error occurred</li>\n</ul>\n"
  },
  {
    "name": "query-service-list-tools",
    "description": "[Query Service] List available agent tools\n\nRetrieve all available tools that can be used by AI agents.<br><br>\n\n<b>Service:</b> Query Service<br>\n<b>Port:</b> 8000<br>\n<b>Base URL:</b> <code>http://localhost:8000</code><br><br>\n\n<b>Overview:</b><br>\nReturns a list of tools registered in the system, including their parameters,\ndescriptions, and tags. Tools are loaded from ArangoDB.<br><br>\n\n<b>Use Cases:</b><br>\n<ul>\n<li>Agent configuration UI - show available tools to assign to agents</li>\n<li>Tool discovery for building custom agent workflows</li>\n</ul>\n"
  },
  {
    "name": "indexing-service-health",
    "description": "[Indexing Service] Health check\n\n⚠️ <b>INTERNAL SERVICE ENDPOINT</b><br><br>\n\nHealth check endpoint for the Indexing Service (Python FastAPI).<br><br>\n\n<b>Service:</b> Indexing Service<br>\n<b>Port:</b> 8091<br>\n<b>Base URL:</b> <code>http://localhost:8091</code><br><br>\n\n<b>Authentication:</b> None required for health check<br><br>\n\n<b>Note:</b> This is an internal service. It processes Kafka messages\nfor document indexing and does not expose user-facing endpoints.\nHealth check also verifies Connector Service connectivity.\n"
  },
  {
    "name": "connector-service-check-health",
    "description": "[Connector Service] Health check\n\n⚠️ <b>INTERNAL SERVICE ENDPOINT</b><br><br>\n\nHealth check endpoint for the Connector Service (Python FastAPI).<br><br>\n\n<b>Service:</b> Connector Service<br>\n<b>Port:</b> 8088<br>\n<b>Base URL:</b> <code>http://localhost:8088</code><br><br>\n\n<b>Authentication:</b> None required for health check<br><br>\n\n<b>Note:</b> This is the core internal service that manages all\ndata source connectors and OAuth flows.\n"
  },
  {
    "name": "connector-services-drive-webhook",
    "description": "[Connector Service] Google Drive webhook\n\n⚠️ <b>INTERNAL SERVICE ENDPOINT</b><br><br>\n\nWebhook endpoint for Google Drive push notifications.<br><br>\n\n<b>Service:</b> Connector Service<br>\n<b>Port:</b> 8088<br>\n<b>Base URL:</b> <code>http://localhost:8088</code><br><br>\n\n<b>Authentication:</b> None required - uses Google's push notification verification<br><br>\n\n<b>Note:</b> This endpoint receives real-time change notifications from\nGoogle Drive when files are created, modified, or deleted.\n"
  },
  {
    "name": "webhooks-verify-gmail",
    "description": "[Connector Service] Gmail webhook verification\n\n⚠️ <b>INTERNAL SERVICE ENDPOINT</b><br><br>\n\nGET handler for Gmail Pub/Sub webhook verification.<br><br>\n\n<b>Service:</b> Connector Service<br>\n<b>Port:</b> 8088<br>\n<b>Base URL:</b> <code>http://localhost:8088</code><br><br>\n\n<b>Authentication:</b> None required - uses Google Pub/Sub verification<br><br>\n\n<b>Note:</b> Google Pub/Sub may send GET requests for subscription verification.\n"
  },
  {
    "name": "webhooks-gmail",
    "description": "[Connector Service] Gmail webhook\n\n⚠️ <b>INTERNAL SERVICE ENDPOINT</b><br><br>\n\nWebhook endpoint for Gmail Pub/Sub notifications.<br><br>\n\n<b>Service:</b> Connector Service<br>\n<b>Port:</b> 8088<br>\n<b>Base URL:</b> <code>http://localhost:8088</code><br><br>\n\n<b>Authentication:</b> None required - uses Google Pub/Sub verification<br><br>\n\n<b>Note:</b> This endpoint receives notifications when new emails arrive\nor email labels change.\n"
  },
  {
    "name": "webhooks-admin",
    "description": "[Connector Service] Google Workspace Admin webhook\n\n⚠️ <b>INTERNAL SERVICE ENDPOINT</b><br><br>\n\nWebhook endpoint for Google Workspace Admin push notifications.<br><br>\n\n<b>Service:</b> Connector Service<br>\n<b>Port:</b> 8088<br>\n<b>Base URL:</b> <code>http://localhost:8088</code><br><br>\n\n<b>Authentication:</b> Verified via Google Workspace webhook signature<br><br>\n\n<b>Note:</b> This endpoint receives notifications about user and group\nchanges from Google Workspace Admin directory (e.g., user created,\ndeleted, suspended, group membership changes).\n"
  },
  {
    "name": "docling-service-health",
    "description": "[Docling Service] Health check\n\n⚠️ <b>INTERNAL SERVICE ENDPOINT</b><br><br>\n\nHealth check endpoint for the Docling Service (Python FastAPI).<br><br>\n\n<b>Service:</b> Docling Service<br>\n<b>Port:</b> 8081<br>\n<b>Base URL:</b> <code>http://localhost:8081</code><br><br>\n\n<b>Authentication:</b> None required for health check<br><br>\n\n<b>Note:</b> This is an internal service used by the Indexing Service\nfor advanced document parsing. No user-facing endpoints.\n"
  },
  {
    "name": "docling-service-process-pdf",
    "description": "[Docling Service] Process PDF document\n\n⚠️ <b>INTERNAL SERVICE ENDPOINT</b><br><br>\n\nFull PDF processing endpoint - parses PDF and creates content blocks.<br><br>\n\n<b>Service:</b> Docling Service<br>\n<b>Port:</b> 8081<br>\n<b>Base URL:</b> <code>http://localhost:8081</code><br><br>\n\n<b>Authentication:</b> Internal only - called by Indexing Service<br><br>\n\n<b>Processing Steps:</b>\n<ol>\n<li>Decode base64 PDF binary</li>\n<li>Parse document structure using Docling library</li>\n<li>Extract text, tables, and images</li>\n<li>Create content blocks for indexing</li>\n</ol>\n\n<b>Timeout:</b> 40 minutes (for large documents)\n"
  },
  {
    "name": "docling-service-parse-pdf",
    "description": "[Docling Service] Parse PDF (Phase 1)\n\n⚠️ <b>INTERNAL SERVICE ENDPOINT</b><br><br>\n\nPhase 1 of two-phase PDF processing - parse PDF without block creation.<br><br>\n\n<b>Service:</b> Docling Service<br>\n<b>Port:</b> 8081<br>\n<b>Base URL:</b> <code>http://localhost:8081</code><br><br>\n\n<b>Authentication:</b> Internal only - called by Indexing Service<br><br>\n\n<b>Note:</b> This endpoint only parses the PDF structure without making\nLLM calls for table processing. Use <code>/create-blocks</code> for Phase 2.\n"
  },
  {
    "name": "doclings-create-blocks",
    "description": "[Docling Service] Create blocks from parse result (Phase 2)\n\n⚠️ <b>INTERNAL SERVICE ENDPOINT</b><br><br>\n\nPhase 2 of two-phase PDF processing - create blocks from parse result.<br><br>\n\n<b>Service:</b> Docling Service<br>\n<b>Port:</b> 8081<br>\n<b>Base URL:</b> <code>http://localhost:8081</code><br><br>\n\n<b>Authentication:</b> Internal only - called by Indexing Service<br><br>\n\n<b>Note:</b> This endpoint creates content blocks from a previously parsed\nPDF document. It may involve LLM calls for table processing.\n"
  }
];

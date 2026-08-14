# Sandbox layer image for the PipesHub integration.
#
# `qm sandbox build` uses this file verbatim and appends a presence check that
# every declared tool binary is on PATH — so if the install below fails, the
# build fails rather than shipping a sandbox where `pipeshub` is missing.
#
# The FROM is intentionally left unpinned here: qm rewrites it to the digest in
# `sandbox.baseImage` from qm.config.jsonc, so the pin lives in one place and
# `qm sandbox publish` records it.
FROM ghcr.io/yc-software/qm/sandbox-base

# The `pipeshub` binary ships as a second bin of @pipeshub-ai/mcp — it is not a
# separate package. Pin the exact version: the sandbox image and the PipesHub
# instance's MCP tool surface need to stay compatible, and an unpinned install
# turns a remote release into a silent change in agent behaviour.
ARG PIPESHUB_CLI_VERSION=2.3.1
RUN npm install -g "@pipeshub-ai/mcp@${PIPESHUB_CLI_VERSION}" \
 && pipeshub --help >/dev/null

# Note for operators on locked-down networks: this reaches the public npm
# registry at build time. If that is blocked, see the README for the
# GitHub-release binary and vendored-tarball alternatives.

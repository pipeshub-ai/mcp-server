import { describe, expect, test } from "bun:test";
import { serverURLFromOptions } from "../src/lib/config.js";

// The server templates are "https://{instance_url}/api/v1" and
// "https://{instance_url}", but the built-in default, the Claude Desktop
// manifest's default and the landing page all supply a full URL such as
// "https://app.pipeshub.com". Substituted literally that is
// "https://https//app.pipeshub.com/api/v1": a host called "https".

const url = (o: Parameters<typeof serverURLFromOptions>[0]) => String(serverURLFromOptions(o));

describe("serverURLFromOptions", () => {
  test("the default points at app.pipeshub.com", () => {
    expect(url({})).toBe("https://app.pipeshub.com/api/v1");
  });

  test("an instance URL with a scheme is used as the origin", () => {
    expect(url({ instance_url: "https://pipeshub.example.com" })).toBe("https://pipeshub.example.com/api/v1");
    expect(url({ instance_url: "https://pipeshub.example.com/" })).toBe("https://pipeshub.example.com/api/v1");
    // A local instance over plain HTTP keeps its scheme rather than being forced to https.
    expect(url({ instance_url: "http://127.0.0.1:3000" })).toBe("http://127.0.0.1:3000/api/v1");
    expect(url({ instance_url: "https://pipeshub.example.com", serverIdx: 1 })).toBe("https://pipeshub.example.com/");
  });

  test("a bare host name still fills the template as before", () => {
    expect(url({ instance_url: "pipeshub.example.com" })).toBe("https://pipeshub.example.com/api/v1");
    expect(url({ instance_url: "pipeshub.example.com", serverIdx: 1 })).toBe("https://pipeshub.example.com/");
  });

  test("an explicit server URL overrides the instance URL", () => {
    expect(url({ serverURL: "http://127.0.0.1:9/api/v1", instance_url: "https://x.example.com" }))
      .toBe("http://127.0.0.1:9/api/v1");
  });

  test("an out-of-range server index is refused", () => {
    expect(() => serverURLFromOptions({ serverIdx: 2 })).toThrow("Invalid server index 2");
  });
});

import { describe, expect, test } from "bun:test";
import { answerEvidence, quotesFor } from "../src/mcp-server/tools/_chatEvidence.js";
import { trimConversation } from "../src/mcp-server/tools/_helpers.js";

// A persisted answer marks each cited sentence with `[N](url)`, where N is
// the citation's `chunkIndex`. These tests build the conversation the chat
// tool reads from RUN_FINISHED and check what the caller gets back.

const url = (n: number) => `https://ph.example.com/record/r${n}/preview#blockIndex=${n}`;

function conversation(answer: string, citations: unknown[]) {
  return {
    _id: "conv-1",
    title: "t",
    status: "Complete",
    messages: [
      { messageType: "user_query", content: "q" },
      { messageType: "bot_response", content: answer, confidence: "High", citations },
    ],
  };
}

function cite(n: number, content: string, md: Record<string, unknown> = {}, citationType = "vectordb|document") {
  return {
    citationId: `c${n}`,
    citationData: {
      content,
      chunkIndex: n,
      citationType,
      metadata: { recordId: `r${n}`, recordName: `Record ${n}`, webUrl: url(n), blockType: "text", ...md },
    },
  };
}

const PR_THREAD = [
  "Release notes for the October train.",
  "PR #3758 fixes the label leak in the knowledge graph and was merged by Priya on 2026-10-02.",
  "PR #3801 is still open and waits on review.",
  "The deploy went out on Friday.",
].join("\n");

describe("claims", () => {
  test("each cited sentence carries its citation numbers and a verbatim quote", () => {
    const answer = `The label leak was fixed in PR #3758, merged on 2026-10-02 [1](${url(1)}).`;
    const out = trimConversation(conversation(answer, [cite(1, PR_THREAD)]));

    expect(out.claims).toHaveLength(1);
    const [claim] = out.claims;
    expect(claim?.citations).toEqual([1]);
    expect(claim?.text).toBe("The label leak was fixed in PR #3758, merged on 2026-10-02 [1].");
    expect(claim?.quotes).toEqual([{
      citation: 1,
      text: "PR #3758 fixes the label leak in the knowledge graph and was merged by Priya on 2026-10-02.",
    }]);
    expect(claim?.notInCitedText).toBeUndefined();
    expect(out.citations[0]).toMatchObject({ number: 1, kind: "passage", passage: PR_THREAD });
  });

  // The commonest wrong claim names a related but different record. Its
  // cited text then lacks the ID the sentence states.
  test("an ID the cited text does not contain is reported", () => {
    const answer = `The label leak was fixed in PR #3992 [1](${url(1)}).`;
    const out = trimConversation(conversation(answer, [cite(1, PR_THREAD)]));

    expect(out.claims[0]?.notInCitedText).toEqual(["#3992"]);
    expect(out.evidenceNote).toContain("notInCitedText");
  });

  test("a version is reported whole, and a different version does not hide it", () => {
    const shipped = answerEvidence(`We shipped v1.2.3 last week [1](${url(1)}).`, [
      { number: 1, kind: "passage", text: "Release notes: v2.2.3 is current." },
    ]);
    expect(shipped.claims[0]?.notInCitedText).toEqual(["v1.2.3"]);

    const twoPart = answerEvidence(`The fix is in v1.2 [1](${url(1)}).`, [
      { number: 1, kind: "passage", text: "The fix landed in the spring release." },
    ]);
    expect(twoPart.claims[0]?.notInCitedText).toEqual(["v1.2"]);

    const withoutV = answerEvidence(`We shipped v1.2.3 last week [1](${url(1)}).`, [
      { number: 1, kind: "passage", text: "Release 1.2.3 went out on Monday." },
    ]);
    expect(withoutV.claims[0]?.notInCitedText).toBeUndefined();
  });

  test("a version inside a longer version does not count as stated", () => {
    const cite1 = (text: string) => [{ number: 1, kind: "passage", text }];
    const missing = (claim: string, text: string) =>
      answerEvidence(`${claim} [1](${url(1)}).`, cite1(text)).claims[0]?.notInCitedText;

    expect(missing("We shipped v1.2", "Release notes: v1.2.3 is current.")).toEqual(["v1.2"]);
    expect(missing("We shipped v2.3 last week", "Release notes: v2.2.3 is current.")).toEqual(["v2.3"]);
    expect(missing("The fix is in v1.10", "The fix is in v1.10.2.")).toEqual(["v1.10"]);
    expect(missing("We shipped 1.2.3", "Release notes: v1.2.3 is current.")).toBeUndefined();
    expect(missing("We shipped v1.2.3", "Release 1.2.3 went out.")).toBeUndefined();
    expect(missing("We shipped V1.2.3", "Release notes: v2.3 is current.")).toEqual(["V1.2.3"]);
    expect(missing("The fix is in V1.2", "The fix landed in the spring release.")).toEqual(["V1.2"]);
    expect(missing("We shipped V1.2.3", "We shipped V1.2.3 yesterday.")).toBeUndefined();
    expect(missing("We shipped v1.2.3", "Release notes: v1.2.3-rc.1 is current.")).toEqual(["v1.2.3"]);
    expect(missing("We shipped v1.2.3", "Built as v1.2.3+build.5 today.")).toEqual(["v1.2.3"]);
    expect(missing("We shipped v1.2.3-rc.1", "Release notes: v1.2.3-rc.2 is current.")).toEqual(["v1.2.3-rc.1"]);
    expect(missing("We shipped 1.2.3-rc.1", "Release notes: v1.2.3-rc.1 is current.")).toBeUndefined();
    expect(missing("We shipped v1.2.3a", "We shipped v1.2.3a on Monday.")).toBeUndefined();
    expect(missing("We shipped v1.2.3a", "We shipped v1.2 on Monday.")).toEqual(["v1.2.3a"]);
    expect(missing("We shipped v1.2.3", "It went out as v1.2.3.")).toBeUndefined();
    expect(missing("We shipped 1.0.0rc1", "Release 1.0.0rc1 is current.")).toBeUndefined();
    expect(missing("We shipped 1.0.0rc2", "Release 1.0 is current.")).toEqual(["1.0.0rc2"]);
    expect(missing("We shipped 3.11.0a1", "Python 3.11 is out.")).toEqual(["3.11.0a1"]);
    expect(missing("We shipped 3.11.0a1", "Python 3.11.0a1 is out.")).toBeUndefined();
    expect(missing("We shipped v1.2.3rc1", "Release notes: v1.2.3rc2 is current.")).toEqual(["v1.2.3rc1"]);
  });

  test("a preview link's block position does not count as a number the record states", () => {
    const out = answerEvidence(`There are 12 reviewers on #12 [1](${url(1)}).`, [
      {
        number: 1,
        kind: "passage",
        text: "Reviewers were assigned on Monday.",
        webUrl: "https://ph.example.com/record/abc/preview#blockIndex=12",
      },
    ]);
    expect(out.claims[0]?.notInCitedText).toEqual(["12", "#12"]);
  });

  test("an ID found in the cited record's name or link is not reported", () => {
    const answer = `PA-1212 tracks the rollout, see PR #4200 [1](${url(1)}).`;
    const out = trimConversation(conversation(answer, [
      cite(1, "Rollout tracked here.", {
        recordName: "PA-1212: Rollout",
        webUrl: "https://github.com/acme/app/pull/4200",
      }),
    ]));

    expect(out.claims[0]?.notInCitedText).toBeUndefined();
  });

  test("numbers match across thousands separators", () => {
    const answer = `The annual fee is $1,250,000 [1](${url(1)}).`;
    const out = trimConversation(conversation(answer, [cite(1, "Annual fee: $1250000, billed yearly.")]));

    expect(out.claims[0]?.notInCitedText).toBeUndefined();
    expect(out.claims[0]?.quotes[0]?.text).toBe("Annual fee: $1250000, billed yearly.");
  });

  test("a marker written after the full stop stays with its sentence", () => {
    const answer = `PR #3801 is still open. [1](${url(1)}) Nothing else changed in that week at all.`;
    const out = trimConversation(conversation(answer, [cite(1, PR_THREAD)]));

    expect(out.claims.map((c) => c.text)).toEqual(["PR #3801 is still open.[1]"]);
    expect(out.uncitedSentences).toEqual(["Nothing else changed in that week at all."]);
  });

  test("one sentence citing two sources gets a quote from each", () => {
    const answer = `PR #3758 was merged by Priya [1](${url(1)}) and the deploy went out on Friday [2](${url(2)}).`;
    const out = trimConversation(conversation(answer, [
      cite(1, PR_THREAD),
      cite(2, "Deploy log: the deploy went out on Friday at noon."),
    ]));

    const [claim] = out.claims;
    expect(claim?.citations).toEqual([1, 2]);
    expect(claim?.quotes.map((q) => q.citation)).toEqual([1, 2]);
  });
});

describe("uncited sentences", () => {
  test("lists prose that cites nothing; headings, table headers and lead-ins are not prose", () => {
    const answer = [
      "## Summary",
      "Here is what I found:",
      `- PR #3758 was merged by Priya [1](${url(1)}).`,
      "- The release also changed the billing page for every customer.",
      "",
      "| PR | Title | Status | Merged by |",
      "|---|---|---|---|",
      `| #3758 | Fix label leak | merged | Priya [1](${url(1)}) |`,
      "",
      "```",
      "this code line is not a sentence of the answer at all",
      "```",
      "**Next steps**",
    ].join("\n");
    const out = trimConversation(conversation(answer, [cite(1, PR_THREAD)]));

    expect(out.uncitedSentences).toEqual([
      "The release also changed the billing page for every customer.",
    ]);
    expect(out.claims).toHaveLength(2);
    expect(out.claims[1]?.text).toBe("#3758 | Fix label leak | merged | Priya [1]");
  });
});

describe("citation kinds", () => {
  test("names what each cited text is, and quotes only the record's own words", () => {
    const answer = [
      `The contract renews in March [1](${url(1)}).`,
      `The contract renews in March [2](${url(2)}).`,
      `The contract renews in March [3](${url(3)}).`,
    ].join("\n");
    const text = "The contract renews in March each year.";
    const out = trimConversation(conversation(answer, [
      cite(1, text, { blockType: "record_summary" }),
      cite(2, text, { blockType: "matched_text" }),
      cite(3, text, {}, "web|url"),
    ]));

    expect(out.citations.map((c) => c.kind)).toEqual(["summary", "matchedText", "web"]);
    expect(out.claims[0]?.quotes).toEqual([]);
    expect(out.claims[1]?.quotes).toEqual([{ citation: 2, text }]);
    expect(out.claims[2]?.quotes).toEqual([{ citation: 3, text }]);
    expect(out.evidenceNote).toContain("`summary` citation");
  });

  test("a record cited by name only is labelled and never quoted", () => {
    const out = trimConversation(conversation(
      `The plan is in the onboarding checklist [1](${url(1)}).`,
      [cite(1, "onboarding-checklist", { blockType: "record_name" })],
    ));
    expect(out.citations[0]?.kind).toBe("recordName");
    expect(out.claims[0]?.quotes).toEqual([]);
  });
});

describe("passages", () => {
  test("a long cited text is cut around the quote, which stays inside it", () => {
    const filler = "Unrelated filler sentence about lunch plans. ".repeat(80);
    const line = "PR #3758 was merged by Priya on 2026-10-02.";
    const content = `${filler}\n${line}\n${filler}`;
    const out = trimConversation(conversation(
      `PR #3758 was merged by Priya [1](${url(1)}).`,
      [cite(1, content)],
    ));

    const [c] = out.citations;
    expect(c?.passageTruncated).toBe(true);
    expect(c?.passageChars).toBe(content.length);
    expect(c?.passage?.length).toBe(1500);
    expect(c?.passage).toContain(line);
  });

  test("many citations share a total budget, but never drop below the floor", () => {
    const citations = Array.from({ length: 40 }, (_, i) => cite(i + 1, "z".repeat(2000)));
    const out = trimConversation(conversation("Nothing cited here at all today.", citations));
    for (const c of out.citations) expect(c.passage?.length).toBe(600);

    const many = Array.from({ length: 80 }, (_, i) => cite(i + 1, "z".repeat(2000)));
    for (const c of trimConversation(conversation("x", many)).citations) {
      expect(c.passage?.length).toBe(400);
    }
  });
});

describe("quotesFor", () => {
  test("offers nothing when no line shares more than one ordinary word", () => {
    expect(quotesFor("The billing migration finished in spring", "Lunch is at noon.\nThe office closes early.")).toEqual([]);
  });

  test("adds a second line when it holds a specific the first lacks", () => {
    const quotes = quotesFor(
      "PR #3758 was merged and PR #3801 is open",
      PR_THREAD,
    );
    expect(quotes).toHaveLength(2);
    expect(quotes[0]).toContain("#3758");
    expect(quotes[1]).toContain("#3801");
  });
});

describe("answerEvidence", () => {
  test("a marker naming no returned citation still makes a claim, with no quotes", () => {
    const out = answerEvidence(`A thing happened [9](${url(9)}).`, []);
    expect(out.claims).toEqual([{ text: "A thing happened [9].", citations: [9], quotes: [] }]);
  });
});

describe("table rows next to a thematic break", () => {
  test("a line of dashes after a table keeps the table's last row", () => {
    const answer = [
      "| PR | Merged by |",
      "|---|---|",
      `| #3990 | merged by Ana [1](${url(1)}) |`,
      `| #3992 | merged by Priya [2](${url(2)}) |`,
      "",
      "---",
      "That is every PR merged this week that touched the billing page.",
    ].join("\n");
    const out = answerEvidence(answer, []);
    expect(out.claims.map((c) => c.text)).toEqual([
      "#3990 | merged by Ana [1]",
      "#3992 | merged by Priya [2]",
    ]);
  });
});

describe("a closing separator row", () => {
  test("a separator after the data rows does not drop the last row", () => {
    const answer = [
      "| PR | Who |",
      "|---|---|",
      `| #3992 | Priya [1](${url(1)}) |`,
      `| #3758 | Ana [1](${url(1)}) |`,
      "|---|---|",
    ].join("\n");
    const out = answerEvidence(answer, [
      { number: 1, kind: "passage", text: "PR #3758 was reviewed by Ana." },
    ]);
    expect(out.claims.map((c) => c.text)).toEqual(["#3992 | Priya [1]", "#3758 | Ana [1]"]);
    expect(out.claims[0]?.notInCitedText).toEqual(["#3992"]);
  });
});

describe("what is not reported", () => {
  test("an offer of more help is not an uncited statement", () => {
    const out = answerEvidence(
      "If you want, I can look for the ticket that tracks this work.\nLet me know which team owns the billing page today.",
      [],
    );
    expect(out.uncitedSentences).toEqual([]);
  });

  test("a conditional fact that opens with \"if you need\" is still a statement", () => {
    const out = answerEvidence(
      "If you need a VPN to reach staging, file a ticket with the platform team.",
      [],
    );
    expect(out.uncitedSentences).toEqual([
      "If you need a VPN to reach staging, file a ticket with the platform team.",
    ]);
  });

  test("a time of day written in the reader's zone is not reported missing", () => {
    const out = answerEvidence(
      `The call moved to 3:45 PM PDT on 2026-07-27 [1](${url(1)}).`,
      [{ number: 1, kind: "passage", text: "Call moved: 2026-07-27 22:45:00 UTC." }],
    );
    expect(out.claims[0]?.notInCitedText).toBeUndefined();
  });
});

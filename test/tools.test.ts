import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FakeAnki, unusedUrl } from "./helpers/fakeAnki.js";
import {
  callTool,
  connect,
  textOf,
  toolNames,
  type Connection,
} from "./helpers/connect.js";

const ENV_KEYS = [
  "ANKI_CONNECT_URL",
  "ANKI_CONNECT_API_KEY",
  "ANKI_MCP_ENABLE_GUI",
  "ANKI_MCP_ENABLE_ADVANCED",
] as const;

const packageVersion: string = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
).version;

const DESTRUCTIVE = [
  "delete_decks",
  "remove_deck_config_id",
  "save_deck_config",
  "update_note_fields",
  "remove_tags",
  "change_deck",
  "gui_exit_anki",
  "upgrade",
  "multi",
];

const READ_ONLY = [
  "find_notes",
  "find_cards",
  "notes_info",
  "cards_info",
  "deck_names",
  "model_names",
  "model_field_names",
  "get_tags",
  "version",
];

const DEFAULT_TOOLS = [
  "add_note",
  "add_notes",
  "can_add_notes",
  "find_notes",
  "find_cards",
  "notes_info",
  "cards_info",
  "deck_names",
  "delete_decks",
  "change_deck",
  "get_deck_config",
  "model_names",
  "version",
  "get_tags",
];

const GUI_TOOLS = [
  "gui_current_card",
  "gui_start_card_timer",
  "gui_show_question",
  "gui_show_answer",
  "gui_answer_card",
  "gui_deck_overview",
  "gui_deck_browser",
  "gui_deck_review",
  "gui_browse",
  "gui_add_cards",
  "gui_exit_anki",
];

const ADVANCED_TOOLS = [
  "multi",
  "upgrade",
  "save_deck_config",
  "set_deck_config_id",
  "clone_deck_config_id",
  "remove_deck_config_id",
];

let savedEnv: NodeJS.ProcessEnv;
let fake: FakeAnki | undefined;
let conn: Connection | undefined;

beforeEach(async () => {
  savedEnv = { ...process.env };
  for (const key of ENV_KEYS) delete process.env[key];
  fake = await FakeAnki.start();
  process.env.ANKI_CONNECT_URL = fake.url;
});

afterEach(async () => {
  await conn?.close();
  conn = undefined;
  await fake?.close();
  fake = undefined;
  for (const key of Object.keys(process.env)) {
    if (!(key in savedEnv)) delete process.env[key];
  }
  Object.assign(process.env, savedEnv);
});

async function start(env: Record<string, string> = {}): Promise<Connection> {
  Object.assign(process.env, env);
  conn = await connect();
  return conn;
}

describe("server metadata", () => {
  it("reports name anki-connect-mcp and the version from package.json", async () => {
    const { client } = await start();
    const info = client.getServerVersion();
    expect(info?.name).toBe("anki-connect-mcp");
    expect(info?.version).toBe(packageVersion);
  });

  it("provides non-empty instructions", async () => {
    const { client } = await start();
    const instructions = client.getInstructions();
    expect(typeof instructions).toBe("string");
    expect(instructions!.trim().length).toBeGreaterThan(0);
  });
});

describe("tool listing", () => {
  it("every tool has a non-empty title, description and boolean hints (all groups enabled)", async () => {
    const { client } = await start({
      ANKI_MCP_ENABLE_GUI: "1",
      ANKI_MCP_ENABLE_ADVANCED: "1",
    });
    const { tools } = await client.listTools();
    expect(tools.length).toBeGreaterThan(0);
    for (const tool of tools) {
      expect(tool.title?.trim(), `${tool.name} title`).toBeTruthy();
      expect(tool.description?.trim(), `${tool.name} description`).toBeTruthy();
      expect(typeof tool.annotations?.readOnlyHint, `${tool.name} readOnlyHint`).toBe("boolean");
      expect(typeof tool.annotations?.destructiveHint, `${tool.name} destructiveHint`).toBe("boolean");
    }
  });

  it("marks destructive tools as destructive and not read-only", async () => {
    const { client } = await start({
      ANKI_MCP_ENABLE_GUI: "1",
      ANKI_MCP_ENABLE_ADVANCED: "1",
    });
    const { tools } = await client.listTools();
    const byName = new Map(tools.map((t) => [t.name, t]));
    for (const name of DESTRUCTIVE) {
      const tool = byName.get(name);
      expect(tool, name).toBeDefined();
      expect(tool!.annotations?.destructiveHint, name).toBe(true);
      expect(tool!.annotations?.readOnlyHint, name).toBe(false);
    }
  });

  it("marks read-only tools as read-only and not destructive", async () => {
    const { client } = await start();
    const { tools } = await client.listTools();
    const byName = new Map(tools.map((t) => [t.name, t]));
    for (const name of READ_ONLY) {
      const tool = byName.get(name);
      expect(tool, name).toBeDefined();
      expect(tool!.annotations?.readOnlyHint, name).toBe(true);
      expect(tool!.annotations?.destructiveHint, name).toBe(false);
    }
  });

  it("marks add_note as neither read-only nor destructive", async () => {
    const { client } = await start();
    const { tools } = await client.listTools();
    const addNote = tools.find((t) => t.name === "add_note");
    expect(addNote).toBeDefined();
    expect(addNote!.annotations?.readOnlyHint).toBe(false);
    expect(addNote!.annotations?.destructiveHint).toBe(false);
  });
});

describe("tool groups", () => {
  it("without flags exposes the default group only", async () => {
    const { client } = await start();
    const names = await toolNames(client);
    for (const name of DEFAULT_TOOLS) expect(names, name).toContain(name);
    expect(names.filter((n) => n.startsWith("gui_"))).toEqual([]);
    for (const name of ADVANCED_TOOLS) expect(names, name).not.toContain(name);
  });

  it.each(["1", "true"])("ANKI_MCP_ENABLE_GUI=%s exposes gui_* tools", async (value) => {
    const { client } = await start({ ANKI_MCP_ENABLE_GUI: value });
    const names = await toolNames(client);
    for (const name of GUI_TOOLS) expect(names, name).toContain(name);
    for (const name of ADVANCED_TOOLS) expect(names, name).not.toContain(name);
  });

  it.each(["1", "true"])("ANKI_MCP_ENABLE_ADVANCED=%s exposes advanced tools", async (value) => {
    const { client } = await start({ ANKI_MCP_ENABLE_ADVANCED: value });
    const names = await toolNames(client);
    for (const name of ADVANCED_TOOLS) expect(names, name).toContain(name);
    expect(names.filter((n) => n.startsWith("gui_"))).toEqual([]);
  });

  it("flags set to other values do not enable groups", async () => {
    const { client } = await start({
      ANKI_MCP_ENABLE_GUI: "0",
      ANKI_MCP_ENABLE_ADVANCED: "false",
    });
    const names = await toolNames(client);
    expect(names.filter((n) => n.startsWith("gui_"))).toEqual([]);
    for (const name of ADVANCED_TOOLS) expect(names, name).not.toContain(name);
  });

  it.each([
    ["no flags", {}],
    ["all flags", { ANKI_MCP_ENABLE_GUI: "1", ANKI_MCP_ENABLE_ADVANCED: "1" }],
  ])("create_flashcard does not exist (%s)", async (_label, env) => {
    const { client } = await start(env as Record<string, string>);
    expect(await toolNames(client)).not.toContain("create_flashcard");
  });
});

describe("requests to AnkiConnect", () => {
  it("add_note sends addNote with version 6 and the note passed through", async () => {
    fake!.respond("addNote", 1234567890);
    const { client } = await start();
    const note = {
      deckName: "Spanish",
      modelName: "Basic",
      fields: { Front: "hola", Back: "hello" },
      tags: ["greetings"],
    };
    const result = await callTool(client, "add_note", note);
    expect(result.isError).toBeFalsy();
    expect(fake!.requests).toHaveLength(1);
    const req = fake!.lastRequest()!;
    expect(req.action).toBe("addNote");
    expect(req.version).toBe(6);
    expect(req.params.note).toMatchObject(note);
  });

  it("deck_names sends deckNames with version 6", async () => {
    fake!.respond("deckNames", ["Default"]);
    const { client } = await start();
    await callTool(client, "deck_names");
    expect(fake!.requests).toHaveLength(1);
    expect(fake!.lastRequest()).toMatchObject({ action: "deckNames", version: 6 });
  });

  it("includes key when ANKI_CONNECT_API_KEY is set", async () => {
    fake!.respond("version", 6).respond("deckNames", []);
    const { client } = await start({ ANKI_CONNECT_API_KEY: "secret" });
    await callTool(client, "version");
    await callTool(client, "deck_names");
    expect(fake!.requests).toHaveLength(2);
    for (const req of fake!.requests) expect(req.key).toBe("secret");
  });

  it("omits key when ANKI_CONNECT_API_KEY is not set", async () => {
    fake!.respond("version", 6);
    const { client } = await start();
    await callTool(client, "version");
    expect(fake!.requests).toHaveLength(1);
    expect(fake!.lastRequest()).not.toHaveProperty("key");
  });
});

describe("results and errors", () => {
  it("returns the bare AnkiConnect result without an envelope", async () => {
    const decks = ["Default", "Spanish::Verbs"];
    fake!.respond("deckNames", decks);
    const { client } = await start();
    const result = await callTool(client, "deck_names");
    expect(result.isError).toBeFalsy();
    expect(textOf(result)).toBe(JSON.stringify(decks));
  });

  it("returns a scalar result without an envelope", async () => {
    fake!.respond("version", 6);
    const { client } = await start();
    const result = await callTool(client, "version");
    expect(result.isError).toBeFalsy();
    expect(textOf(result)).toBe(JSON.stringify(6));
  });

  it("reports an AnkiConnect error as isError with the error text", async () => {
    fake!.fail("addNote", "cannot create note because it is a duplicate");
    const { client } = await start();
    const result = await callTool(client, "add_note", {
      deckName: "Default",
      modelName: "Basic",
      fields: { Front: "a", Back: "b" },
    });
    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain("cannot create note because it is a duplicate");
  });

  it("reports an unreachable AnkiConnect as isError mentioning the URL, and keeps working", async () => {
    const url = await unusedUrl();
    const { client } = await start({ ANKI_CONNECT_URL: url });

    const first = await callTool(client, "version");
    expect(first.isError).toBe(true);
    expect(textOf(first)).toContain(url);

    // The client is not broken: a second failing call is still answered.
    const second = await callTool(client, "deck_names");
    expect(second.isError).toBe(true);

    // Once AnkiConnect comes up at that address, calls succeed.
    const port = Number(new URL(url).port);
    const late = await FakeAnki.start(port);
    try {
      late.respond("version", 6);
      const third = await callTool(client, "version");
      expect(third.isError).toBeFalsy();
      expect(textOf(third)).toBe("6");
    } finally {
      await late.close();
    }
  });
});

describe.each([
  ["find_notes", "findNotes"],
  ["find_cards", "findCards"],
])("%s", (tool, action) => {
  const ids = (n: number) => Array.from({ length: n }, (_, i) => 1000 + i);

  it("sends the query to AnkiConnect", async () => {
    fake!.respond(action, ids(3));
    const { client } = await start();
    await callTool(client, tool, { query: "deck:Spanish tag:verb" });
    expect(fake!.requests).toHaveLength(1);
    const req = fake!.lastRequest()!;
    expect(req.action).toBe(action);
    expect(req.version).toBe(6);
    expect(req.params.query).toBe("deck:Spanish tag:verb");
  });

  it("truncates to the default limit of 100", async () => {
    fake!.respond(action, ids(250));
    const { client } = await start();
    const result = await callTool(client, tool, { query: "deck:*" });
    expect(result.isError).toBeFalsy();
    const parsed = JSON.parse(textOf(result));
    expect(parsed.ids).toEqual(ids(100));
    expect(parsed.total).toBe(250);
    expect(parsed.truncated).toBe(true);
  });

  it("respects a custom limit", async () => {
    fake!.respond(action, ids(250));
    const { client } = await start();
    const result = await callTool(client, tool, { query: "deck:*", limit: 10 });
    const parsed = JSON.parse(textOf(result));
    expect(parsed.ids).toEqual(ids(10));
    expect(parsed.total).toBe(250);
    expect(parsed.truncated).toBe(true);
  });

  it("does not truncate when results fit under the limit", async () => {
    fake!.respond(action, ids(5));
    const { client } = await start();
    const result = await callTool(client, tool, { query: "deck:*" });
    const parsed = JSON.parse(textOf(result));
    expect(parsed).toEqual({ ids: ids(5), total: 5, truncated: false });
  });

  it("does not truncate when results equal the limit", async () => {
    fake!.respond(action, ids(10));
    const { client } = await start();
    const result = await callTool(client, tool, { query: "deck:*", limit: 10 });
    const parsed = JSON.parse(textOf(result));
    expect(parsed).toEqual({ ids: ids(10), total: 10, truncated: false });
  });
});

describe("cards_info", () => {
  it("strips <style> blocks from question/answer and drops css, preserving other fields", async () => {
    const card = (id: number, question: string, answer: string) => ({
      cardId: id,
      note: id + 1,
      deckName: "Spanish",
      modelName: "Basic",
      fieldOrder: 0,
      fields: { Front: { value: "hola", order: 0 }, Back: { value: "hello", order: 1 } },
      interval: 3,
      question,
      answer,
      css: ".card { font-family: arial; color: black; }",
    });
    fake!.respond("cardsInfo", [
      card(1, "<style>.card{color:red}</style>hola", "<style>.card{color:red}</style>hola<hr id=answer>hello"),
      card(
        2,
        '<STYLE type="text/css">\n.card {\n  color: red;\n}\n</STYLE>\n<div>uno</div>',
        "<Style>\n.card{color:red}\n</Style><div>uno</div><hr id=answer>one",
      ),
    ]);
    const { client } = await start();
    const result = await callTool(client, "cards_info", { cards: [1, 2] });
    expect(result.isError).toBeFalsy();
    expect(fake!.lastRequest()).toMatchObject({
      action: "cardsInfo",
      version: 6,
      params: { cards: [1, 2] },
    });

    const cards = JSON.parse(textOf(result));
    expect(cards).toHaveLength(2);
    for (const c of cards) {
      expect(c).not.toHaveProperty("css");
      expect(c.question.toLowerCase()).not.toContain("<style");
      expect(c.answer.toLowerCase()).not.toContain("<style");
      expect(c.question).not.toContain("color");
      expect(c.answer).not.toContain("color");
      expect(c.deckName).toBe("Spanish");
      expect(c.modelName).toBe("Basic");
      expect(c.interval).toBe(3);
      expect(c.fields).toEqual({
        Front: { value: "hola", order: 0 },
        Back: { value: "hello", order: 1 },
      });
    }
    expect(cards[0].cardId).toBe(1);
    expect(cards[0].note).toBe(2);
    expect(cards[0].question).toContain("hola");
    expect(cards[0].answer).toContain("hello");
    expect(cards[1].cardId).toBe(2);
    expect(cards[1].question).toContain("<div>uno</div>");
    expect(cards[1].answer).toContain("one");
  });
});

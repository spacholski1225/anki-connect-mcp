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
  "delete_media_file",
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
  "get_media_files_names",
  "retrieve_media_file",
  "get_media_dir_path",
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
  "store_media_file",
  "get_media_files_names",
  "retrieve_media_file",
  "delete_media_file",
  "get_media_dir_path",
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
    // Appending media is not idempotent: each retry adds another tag.
    expect(byName.get("update_note_fields")!.annotations?.idempotentHint).toBe(false);
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
  ["find_notes", "findNotes", "query", "ids"],
  ["find_cards", "findCards", "query", "ids"],
  ["get_media_files_names", "getMediaFilesNames", "pattern", "names"],
])("%s", (tool, action, argKey, resultKey) => {
  const ids = (n: number) => Array.from({ length: n }, (_, i) => 1000 + i);

  it("sends the search argument to AnkiConnect", async () => {
    fake!.respond(action, ids(3));
    const { client } = await start();
    await callTool(client, tool, { [argKey]: "deck:Spanish tag:verb" });
    expect(fake!.requests).toHaveLength(1);
    const req = fake!.lastRequest()!;
    expect(req.action).toBe(action);
    expect(req.version).toBe(6);
    expect(req.params[argKey]).toBe("deck:Spanish tag:verb");
  });

  it("truncates to the default limit of 100", async () => {
    fake!.respond(action, ids(250));
    const { client } = await start();
    const result = await callTool(client, tool, { [argKey]: "deck:*" });
    expect(result.isError).toBeFalsy();
    const parsed = JSON.parse(textOf(result));
    expect(parsed[resultKey]).toEqual(ids(100));
    expect(parsed.total).toBe(250);
    expect(parsed.truncated).toBe(true);
  });

  it("respects a custom limit", async () => {
    fake!.respond(action, ids(250));
    const { client } = await start();
    const result = await callTool(client, tool, { [argKey]: "deck:*", limit: 10 });
    const parsed = JSON.parse(textOf(result));
    expect(parsed[resultKey]).toEqual(ids(10));
    expect(parsed.total).toBe(250);
    expect(parsed.truncated).toBe(true);
  });

  it("does not truncate when results fit under the limit", async () => {
    fake!.respond(action, ids(5));
    const { client } = await start();
    const result = await callTool(client, tool, { [argKey]: "deck:*" });
    const parsed = JSON.parse(textOf(result));
    expect(parsed).toEqual({ [resultKey]: ids(5), total: 5, truncated: false });
  });

  it("does not truncate when results equal the limit", async () => {
    fake!.respond(action, ids(10));
    const { client } = await start();
    const result = await callTool(client, tool, { [argKey]: "deck:*", limit: 10 });
    const parsed = JSON.parse(textOf(result));
    expect(parsed).toEqual({ [resultKey]: ids(10), total: 10, truncated: false });
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

describe("media", () => {
  const PIXEL_PNG =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

  beforeEach(() => {
    fake!.respond("modelFieldNames", ["Front", "Back"]);
    fake!.on("storeMediaFile", (r) => ({ result: r.params.filename, error: null }));
    fake!.respond("addNote", 42);
  });

  const BASIC_FIELDS: Record<string, string> = { Front: "cat", Back: "a pet" };
  const basicNote = (extra: Record<string, unknown> = {}) => ({
    deckName: "Default",
    modelName: "Basic",
    fields: { ...BASIC_FIELDS },
    ...extra,
  });

  it.each([
    {
      kind: "picture",
      source: "https://example.com/img/cat%20photo.jpg?w=200",
      paramKey: "url",
      requested: "cat photo.jpg",
      stored: "cat_photo_1.jpg",
      field: "Back",
      tag: '<img src="cat_photo_1.jpg">',
    },
    {
      kind: "audio",
      source: "/home/u/hola.mp3",
      paramKey: "path",
      requested: "hola.mp3",
      stored: "hola.mp3",
      field: "Front",
      tag: "[sound:hola.mp3]",
    },
    {
      kind: "video",
      source: "C:\\Users\\u\\clip.mp4",
      paramKey: "path",
      requested: "clip.mp4",
      stored: "clip.mp4",
      field: "Back",
      tag: "[sound:clip.mp4]",
    },
  ])("$kind from $source lands in $field under the name Anki chose", async ({ kind, source, paramKey, requested, stored, field, tag }) => {
    fake!.respond("storeMediaFile", stored);
    const { client } = await start();
    const result = await callTool(client, "add_note", basicNote({ [kind]: [{ source, fields: [field] }] }));
    expect(result.isError).toBeFalsy();
    expect(textOf(result)).toBe("42");
    expect(fake!.requestsOf("storeMediaFile").map((r) => r.params)).toEqual([
      { filename: requested, [paramKey]: source, deleteExisting: false },
    ]);
    const [addNote] = fake!.requestsOf("addNote");
    expect(addNote!.params.note.fields[field]).toBe(`${BASIC_FIELDS[field]}<br>${tag}`);
    for (const key of ["picture", "audio", "video"]) expect(addNote!.params.note).not.toHaveProperty(key);
  });

  it.each([
    {
      name: "two pictures on one field, one listing it twice",
      extra: {
        picture: [
          { source: "/t/a.png", fields: ["Back", "Back"] },
          { source: "/t/b.png", fields: ["Back"] },
        ],
      },
      expected: { Front: "cat", Back: 'a pet<br><img src="a.png"><br><img src="b.png">' },
    },
    {
      name: "target missing from fields",
      extra: { fields: { Front: "cat" }, picture: [{ source: "/t/a.png", fields: ["Back"] }] },
      expected: { Front: "cat", Back: '<img src="a.png">' },
    },
    {
      name: "caller uses lowercase keys",
      extra: { fields: { front: "cat", back: "a pet" }, picture: [{ source: "/t/a.png", fields: ["Back"] }] },
      expected: { Front: "cat", Back: 'a pet<br><img src="a.png">' },
    },
  ])("add_note composes fields: $name", async ({ extra, expected }) => {
    const { client } = await start();
    const result = await callTool(client, "add_note", basicNote(extra));
    expect(result.isError).toBeFalsy();
    expect(fake!.requestsOf("addNote")[0]!.params.note.fields).toEqual(expected);
  });

  it("add_notes attaches media to the right notes in a batch mixing models and notes without media", async () => {
    fake!.on("modelFieldNames", (r) => ({
      result: r.params.modelName === "Vocab" ? ["Word", "Meaning", "Sound"] : ["Front", "Back"],
      error: null,
    }));
    fake!.respond("addNotes", [1, 2, 3]);
    const { client } = await start();
    const vocab = {
      deckName: "Default",
      modelName: "Vocab",
      fields: { Word: "hola", Meaning: "hello" },
      audio: [{ source: "/t/hola.mp3", fields: ["Sound"] }],
    };
    const result = await callTool(client, "add_notes", {
      notes: [basicNote({ picture: [{ source: "/t/a.png", fields: ["Back"] }] }), basicNote(), vocab],
    });
    expect(result.isError).toBeFalsy();
    expect(textOf(result)).toBe("[1,2,3]");
    const [addNotes] = fake!.requestsOf("addNotes");
    expect(addNotes!.params.notes).toEqual([
      { deckName: "Default", modelName: "Basic", fields: { Front: "cat", Back: 'a pet<br><img src="a.png">' } },
      { deckName: "Default", modelName: "Basic", fields: { Front: "cat", Back: "a pet" } },
      { deckName: "Default", modelName: "Vocab", fields: { Word: "hola", Meaning: "hello", Sound: "[sound:hola.mp3]" } },
    ]);
  });

  const picture = (source: string, target = "Back") => ({ picture: [{ source, fields: [target] }] });

  it.each([
    {
      name: "unknown target field",
      tool: "add_note",
      args: basicNote(picture("/t/a.png", "Bakc")),
      expected: 'picture[0]: "Bakc" is not a field of model "Basic". Fields: Front, Back.',
      storesNothing: true,
    },
    {
      name: "URL without a file name",
      tool: "add_note",
      args: basicNote(picture("https://example.com")),
      expected: 'pass "filename"',
      storesNothing: true,
    },
    {
      name: "invalid URL",
      tool: "add_note",
      args: basicNote(picture("https://exa mple.com/a.png")),
      expected: "is not a valid URL",
      storesNothing: true,
    },
    {
      name: "empty target list",
      tool: "add_note",
      args: basicNote({ picture: [{ source: "/t/a.png", fields: [] }] }),
      expected: "fields",
      storesNothing: true,
    },
    {
      name: "a bad note in a batch is caught before anything is stored",
      tool: "add_notes",
      args: { notes: [basicNote(picture("/t/a.png")), basicNote(picture("/t/b.png", "Bakc"))] },
      expected: 'notes[1].picture[0]: "Bakc"',
      storesNothing: true,
    },
    {
      name: "a failed download names the note and the source",
      tool: "add_notes",
      args: { notes: [basicNote(picture("https://x/a.png")), basicNote(picture("https://x/b.png"))] },
      failUrl: "https://x/b.png",
      expected: "notes[1].picture[0] (https://x/b.png): https://x/b.png download failed with return code 404",
      storesNothing: false,
    },
  ])("$tool fails without creating notes: $name", async ({ tool, args, failUrl, expected, storesNothing }) => {
    if (failUrl) {
      fake!.on("storeMediaFile", (r) =>
        r.params.url === failUrl
          ? { result: null, error: `${failUrl} download failed with return code 404` }
          : { result: r.params.filename, error: null },
      );
    }
    const { client } = await start();
    const result = await callTool(client, tool, args);
    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain(expected);
    expect(fake!.requestsOf("addNote")).toEqual([]);
    expect(fake!.requestsOf("addNotes")).toEqual([]);
    if (storesNothing) expect(fake!.requestsOf("storeMediaFile")).toEqual([]);
  });

  const NOTE_7 = {
    noteId: 7,
    modelName: "Basic",
    fields: { Front: { value: "dog", order: 0 }, Back: { value: "a pet", order: 1 } },
  };
  const dogPicture = { picture: [{ source: "/t/dog.png", fields: ["Back"] }] };

  it.each([
    {
      name: "target not overwritten",
      args: { id: 7, fields: { Front: "Dog" }, ...dogPicture },
      expected: { id: 7, fields: { Front: "Dog", Back: 'a pet<br><img src="dog.png">' } },
    },
    {
      name: "fields omitted",
      args: { id: 7, ...dogPicture },
      expected: { id: 7, fields: { Back: 'a pet<br><img src="dog.png">' } },
    },
    {
      name: "target overwritten",
      args: { id: 7, fields: { Back: "new" }, ...dogPicture },
      expected: { id: 7, fields: { Back: 'new<br><img src="dog.png">' } },
    },
    {
      name: "no media",
      args: { id: 7, fields: { Front: "x" } },
      expected: { id: 7, fields: { Front: "x" } },
      onlyRequest: true,
    },
  ])("update_note_fields: $name", async ({ args, expected, onlyRequest }) => {
    fake!.respond("notesInfo", [NOTE_7]);
    const { client } = await start();
    const result = await callTool(client, "update_note_fields", args);
    expect(result.isError).toBeFalsy();
    expect(fake!.requestsOf("updateNoteFields")[0]!.params.note).toEqual(expected);
    if (onlyRequest) expect(fake!.requests).toHaveLength(1);
  });

  it("update_note_fields reports an unknown note", async () => {
    fake!.respond("notesInfo", [{}]);
    const { client } = await start();
    const result = await callTool(client, "update_note_fields", { id: 7, ...dogPicture });
    expect(result.isError).toBe(true);
    expect(textOf(result)).toBe("Note 7 was not found.");
    expect(fake!.requestsOf("updateNoteFields")).toEqual([]);
  });

  it.each([
    {
      name: "a small PNG comes back as an image",
      tool: "retrieve_media_file",
      args: { filename: "cat.png" },
      action: "retrieveMediaFile",
      fakeResult: PIXEL_PNG,
      expected: { content: [{ type: "image", mimeType: "image/png", data: PIXEL_PNG }] },
    },
    {
      name: "an image over 5 MB is described, not returned",
      tool: "retrieve_media_file",
      args: { filename: "big.png" },
      action: "retrieveMediaFile",
      fakeResult: Buffer.alloc(5 * 1024 * 1024 + 1).toString("base64"),
      expected: { content: [{ type: "text", text: JSON.stringify({ filename: "big.png", bytes: 5242881 }) }] },
    },
    {
      name: "audio is described, not returned",
      tool: "retrieve_media_file",
      args: { filename: "hola.mp3" },
      action: "retrieveMediaFile",
      fakeResult: Buffer.from("abc").toString("base64"),
      expected: { content: [{ type: "text", text: JSON.stringify({ filename: "hola.mp3", bytes: 3 }) }] },
    },
    {
      name: "a missing file is an error",
      tool: "retrieve_media_file",
      args: { filename: "x.png" },
      action: "retrieveMediaFile",
      fakeResult: false,
      expected: { isError: true, content: [{ type: "text", text: 'Media file "x.png" was not found.' }] },
    },
    {
      name: "returns the name Anki chose and never overwrites",
      tool: "store_media_file",
      args: { source: "https://example.com/a/cat.png" },
      action: "storeMediaFile",
      fakeResult: "cat_1.png",
      expected: { content: [{ type: "text", text: JSON.stringify("cat_1.png") }] },
      params: { filename: "cat.png", url: "https://example.com/a/cat.png", deleteExisting: false },
    },
  ])("$tool: $name", async ({ tool, args, action, fakeResult, expected, params }) => {
    fake!.respond(action, fakeResult);
    const { client } = await start();
    const result = await callTool(client, tool, args);
    expect(result.isError ?? false).toBe(expected.isError ?? false);
    expect(result.content).toEqual(expected.content);
    if (params) expect(fake!.lastRequest()!.params).toEqual(params);
  });
});

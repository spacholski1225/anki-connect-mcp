import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { onTestFinished } from "vitest";

/** Creates a temp dir that is removed when the current test finishes. */
export async function testTempDir(prefix: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), prefix));
  onTestFinished(() => rm(dir, { recursive: true, force: true }));
  return dir;
}

/**
 * Puts a stub `wl-paste` or `xclip` first on PATH so the real clipboard reader runs against fixed content.
 * The list call prints `types` (or exits 1 when empty, like an empty clipboard); any other call prints `content`.
 */
export async function installFakeClipboard(opts: {
  tool: "wl-paste" | "xclip";
  types: string[];
  content?: Buffer;
}): Promise<void> {
  const dir = await testTempDir("fake-clipboard-");
  const clip = join(dir, "clip.bin");
  await writeFile(clip, opts.content ?? Buffer.alloc(0));
  const list = opts.types.length ? `printf '%s\\n' ${opts.types.map((t) => `'${t}'`).join(" ")}` : "exit 1";
  const script = `#!/bin/sh
for arg in "$@"; do
  case "$arg" in
    --list-types|TARGETS) ${list}; exit 0 ;;
  esac
done
cat '${clip}'
`;
  const bin = join(dir, opts.tool);
  await writeFile(bin, script);
  await chmod(bin, 0o755);
  process.env.PATH = `${dir}:${process.env.PATH ?? ""}`;
  if (opts.tool === "wl-paste") process.env.WAYLAND_DISPLAY = "wayland-test";
  else delete process.env.WAYLAND_DISPLAY;
}

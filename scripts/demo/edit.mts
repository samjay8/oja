// Cuts the raw take into the finished demo: long waits play fast, scenes crossfade into
// each other, and a contact sheet is written for review.
//   tsx scripts/demo/edit.mts [demo/raw] [demo/oja-demo.mp4]
// Needs ffmpeg and ffprobe on PATH.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

const RAW = process.argv[2] ?? "demo/raw";
const FINAL = process.argv[3] ?? "demo/oja-demo.mp4";
const FPS = 30;
const XFADE = 0.55; // seconds of blend between scenes
const marks = JSON.parse(readFileSync(join(RAW, "marks.json"), "utf8")) as { scenes: { name: string; start: number; end: number; cuts: [number, number, number][] }[] };

mkdirSync(dirname(FINAL), { recursive: true });
const work = join(RAW, "work");
mkdirSync(work, { recursive: true });
const ff = (args: string[]) => execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: "inherit" });
const duration = (f: string) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString().trim());

// 1. Constant frame rate master (the webm's timing is loose).
const master = join(work, "master.mp4");
if (!existsSync(master)) ff(["-i", join(RAW, "take.webm"), "-vf", `fps=${FPS},format=yuv420p`, "-c:v", "libx264", "-preset", "fast", "-crf", "16", master]);
const total = duration(master);
console.log(`[edit] master ${total.toFixed(1)}s`);

// 2. One clip per scene, with its waits compressed.
const clips: string[] = [];
marks.scenes.forEach((s, i) => {
  const end = Math.min(s.end, total);
  const segs: { a: number; b: number; speed: number }[] = [];
  let cursor = s.start;
  for (const [a, b, speed] of s.cuts.sort((x, y) => x[0] - y[0])) {
    const ca = Math.max(cursor, a), cb = Math.min(end, b);
    if (cb <= ca) continue;
    if (ca > cursor) segs.push({ a: cursor, b: ca, speed: 1 });
    segs.push({ a: ca, b: cb, speed });
    cursor = cb;
  }
  if (end > cursor) segs.push({ a: cursor, b: end, speed: 1 });
  const parts = segs.map((g, k) => `[0:v]trim=start=${g.a.toFixed(3)}:end=${g.b.toFixed(3)},setpts=(PTS-STARTPTS)/${g.speed}[s${k}]`);
  const graph = `${parts.join(";")};${segs.map((_, k) => `[s${k}]`).join("")}concat=n=${segs.length}:v=1:a=0,fps=${FPS}[v]`;
  const out = join(work, `scene-${String(i).padStart(2, "0")}-${s.name.replace(/\W+/g, "-")}.mp4`);
  ff(["-i", master, "-filter_complex", graph, "-map", "[v]", "-c:v", "libx264", "-preset", "fast", "-crf", "16", out]);
  clips.push(out);
  const edited = segs.reduce((n, g) => n + (g.b - g.a) / g.speed, 0);
  console.log(`[edit] ${s.name.padEnd(12)} ${(end - s.start).toFixed(1).padStart(5)}s → ${edited.toFixed(1).padStart(5)}s`);
});

// 3. Crossfade the scenes into one piece.
const lens = clips.map(duration);
const inputs = clips.flatMap((c) => ["-i", c]);
let graph = "";
let prev = "[0:v]";
let offset = 0;
for (let i = 1; i < clips.length; i++) {
  offset += lens[i - 1] - XFADE;
  const out = i === clips.length - 1 ? "[v]" : `[x${i}]`;
  graph += `${prev}[${i}:v]xfade=transition=fade:duration=${XFADE}:offset=${offset.toFixed(3)}${out};`;
  prev = out;
}
graph = graph.replace(/;$/, "");
ff([...inputs, "-filter_complex", graph, "-map", "[v]", "-c:v", "libx264", "-preset", "slow", "-crf", "19", "-pix_fmt", "yuv420p", "-movflags", "+faststart", FINAL]);
const finalLen = duration(FINAL);
console.log(`[edit] final ${Math.floor(finalLen / 60)}:${String(Math.round(finalLen % 60)).padStart(2, "0")} → ${FINAL}`);

// 4. Contact sheet: one frame every 4 s.
const sheet = FINAL.replace(/\.mp4$/, "-sheet.png");
const cols = 5, rows = Math.ceil(finalLen / 4 / cols);
ff(["-i", FINAL, "-vf", `fps=1/4,scale=400:-1,tile=${cols}x${rows}:padding=4:color=white`, "-frames:v", "1", sheet]);
console.log(`[edit] sheet → ${sheet}`);

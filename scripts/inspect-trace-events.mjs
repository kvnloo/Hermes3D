import fs from "node:fs";
const trace = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
for (const event of trace.traceEvents ?? []) {
  if (event.name === "Display::FrameDisplayed" || event.name === "DroppedFrame" || event.name === "FrameSequenceTrackerV3") {
    console.log(JSON.stringify(event));
  }
}

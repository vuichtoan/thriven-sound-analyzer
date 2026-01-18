#!/usr/bin/env node
import { Command } from "commander";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { scanCommand } from "./cli/scan.js";
import { analyzeCommand } from "./cli/analyze.js";
import { exportCommand } from "./cli/export.js";
import { processCommand } from "./cli/process.js";
import { stemmapCommand, applyStemmapCommand } from "./cli/stemmap.js";
import { br864Command } from "./cli/br864.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf-8"));

const program = new Command();
program
  .name("thriven")
  .description("Offline-first audio analyzer & 8-stem pack tool (Suno → Ableton → BR-864)")
  .version(pkg.version);

program.addCommand(scanCommand);
program.addCommand(analyzeCommand);
program.addCommand(exportCommand);
program.addCommand(processCommand);
program.addCommand(stemmapCommand);
program.addCommand(applyStemmapCommand);
program.addCommand(br864Command);

program.parse(process.argv);
if (!process.argv.slice(2).length) program.outputHelp();

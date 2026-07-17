#!/usr/bin/env node

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { resolve, join } from "node:path";
import { parse } from "yaml";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const AjvCtor = Ajv.default ?? Ajv;
const addFmt = addFormats.default ?? addFormats;

const TASKS_DIR = resolve(process.cwd(), "tasks");
const SCHEMA_PATH = resolve(process.cwd(), "spec", "task-schema.json");

const schemaRaw = readFileSync(SCHEMA_PATH, "utf-8");
const schema = JSON.parse(schemaRaw);
delete schema.$schema;

const ajv = new AjvCtor({ allErrors: true, strict: false });
addFmt(ajv);
const validate = ajv.compile(schema);

function findTaskYamls(dir) {
  const results = [];
  if (!existsSync(dir)) return results;
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      const taskYaml = join(full, "task.yaml");
      if (existsSync(taskYaml)) results.push(taskYaml);
      results.push(...findTaskYamls(full));
    }
  }
  return results;
}

const yamlFiles = findTaskYamls(TASKS_DIR).sort();
let valid = 0;
let invalid = 0;
const issues = [];

for (const path of yamlFiles) {
  try {
    const raw = readFileSync(path, "utf-8");
    const data = parse(raw);
    const ok = validate(data);

    if (!ok) {
      invalid++;
      const errs = (validate.errors ?? [])
        .map(e => `  ${e.instancePath}: ${e.message}`)
        .join("\n");
      console.log(`✗ ${data?.id ?? path}`);
      console.log(errs);
      issues.push({ path, errors: validate.errors });
      continue;
    }

    // Check rubric weights
    const wsum = data.rubric.reduce((s, r) => s + r.weight, 0);
    if (Math.abs(wsum - 1.0) > 0.01) {
      invalid++;
      console.log(`✗ ${data.id}: rubric weights sum to ${wsum} (must be 1.0)`);
      issues.push({ path, errors: [{ message: `weights sum: ${wsum}` }] });
      continue;
    }

    // Check directory has required subdirs
    const taskDir = resolve(path, "..");
    const hasRepo = existsSync(join(taskDir, "repo"));
    const hasGt = existsSync(join(taskDir, "ground-truth"));
    const hasTests = existsSync(join(taskDir, "tests"));

    const missing = [];
    if (!hasRepo) missing.push("repo/");
    if (!hasGt) missing.push("ground-truth/");
    if (!hasTests) missing.push("tests/");

    if (missing.length > 0) {
      invalid++;
      console.log(`✗ ${data.id}: missing directories: ${missing.join(", ")}`);
      issues.push({ path, errors: [{ message: `missing: ${missing.join(", ")}` }] });
      continue;
    }

    // Check tests dir has files
    const testFiles = readdirSync(join(taskDir, "tests")).filter(f => !f.startsWith("."));
    if (testFiles.length === 0) {
      invalid++;
      console.log(`✗ ${data.id}: tests/ directory is empty`);
      issues.push({ path, errors: [{ message: "empty tests/" }] });
      continue;
    }

    valid++;
    console.log(`✓ ${data.id} (${data.category}, ${data.difficulty}, ${data.language})`);
  } catch (err) {
    invalid++;
    console.log(`✗ ${path}: ${err.message}`);
    issues.push({ path, errors: [{ message: err.message }] });
  }
}

console.log(`\n${valid} valid, ${invalid} invalid out of ${yamlFiles.length} total`);

if (invalid > 0) {
  process.exit(1);
}

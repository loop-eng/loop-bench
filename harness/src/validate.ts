import AjvModule from "ajv";
import addFormatsModule from "ajv-formats";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const AjvCtor =
  (AjvModule as unknown as { default?: typeof AjvModule }).default ?? AjvModule;
const addFormats =
  (addFormatsModule as unknown as { default?: typeof addFormatsModule })
    .default ?? addFormatsModule;

const __dirname = dirname(fileURLToPath(import.meta.url));

function specPath(filename: string): string {
  const candidates = [
    resolve(__dirname, "..", "..", "spec", filename),
    resolve(__dirname, "..", "spec", filename),
    join(process.cwd(), "spec", filename),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return candidates[0]!;
}

export interface ValidationError {
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

type ValidateFn = (data: unknown) => boolean;

interface ValidateFnWithErrors extends ValidateFn {
  errors?: Array<{ instancePath?: string; message?: string }> | null;
}

const validators = new Map<string, ValidateFnWithErrors>();

function getValidator(schemaFile: string): ValidateFnWithErrors {
  const cached = validators.get(schemaFile);
  if (cached) return cached;

  const raw = readFileSync(specPath(schemaFile), "utf-8");
  const schema = JSON.parse(raw) as Record<string, unknown>;

  delete schema.$schema;

  const ajv = new (AjvCtor as unknown as new (
    opts: object,
  ) => {
    compile: (s: object) => ValidateFnWithErrors;
  })({ allErrors: true, strict: false });
  (addFormats as unknown as (a: unknown) => void)(ajv);

  const validate = ajv.compile(schema);
  validators.set(schemaFile, validate);
  return validate;
}

function toErrors(
  errs: Array<{ instancePath?: string; message?: string }> | null | undefined,
): ValidationError[] {
  return (errs ?? []).map((err) => ({
    path: err.instancePath || "/",
    message: err.message ?? "Unknown validation error",
  }));
}

export function validateTask(data: unknown): ValidationResult {
  const validate = getValidator("task-schema.json");
  const valid = validate(data);

  if (valid) {
    return validateRubricWeights(data as Record<string, unknown>);
  }

  return { valid: false, errors: toErrors(validate.errors) };
}

export function validateResult(data: unknown): ValidationResult {
  const validate = getValidator("result-schema.json");
  const valid = validate(data);

  if (valid) return { valid: true, errors: [] };

  return { valid: false, errors: toErrors(validate.errors) };
}

function validateRubricWeights(
  data: Record<string, unknown>,
): ValidationResult {
  const rubric = data.rubric as Array<{ weight: number }> | undefined;
  if (!rubric || rubric.length === 0) return { valid: true, errors: [] };

  const total = rubric.reduce((sum, r) => sum + r.weight, 0);
  if (Math.abs(total - 1.0) > 0.001) {
    return {
      valid: false,
      errors: [
        {
          path: "/rubric",
          message: `Rubric weights must sum to 1.0, got ${total.toFixed(4)}`,
        },
      ],
    };
  }

  return { valid: true, errors: [] };
}

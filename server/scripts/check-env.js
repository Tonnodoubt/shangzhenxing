const path = require("path");
const dotenv = require("dotenv");
const {
  readRuntimeEnv,
  validateRuntimeEnv,
  formatValidationReport
} = require("../src/config/env");

dotenv.config({
  path: path.resolve(__dirname, "../.env")
});

function main() {
  const strict = process.argv.includes("--strict");
  const config = readRuntimeEnv(process.env);
  const result = validateRuntimeEnv(config, {
    strict,
    context: "env-check"
  });
  const report = formatValidationReport(result, {
    context: "env-check"
  });

  console.log(report);

  if (result.errors.length) {
    process.exit(1);
  }
}

main();

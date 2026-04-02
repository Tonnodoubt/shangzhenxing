module.exports = {
  root: true,
  env: {
    commonjs: true,
    es2022: true,
    node: true
  },
  extends: ["eslint:recommended"],
  ignorePatterns: ["node_modules/", "public/"],
  overrides: [
    {
      files: ["src/**/*.js", "tests/**/*.js", "scripts/**/*.js"],
      globals: {
        URL: "readonly",
        fetch: "readonly"
      },
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "script"
      },
      rules: {
        "no-unused-vars": ["error", {
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_"
        }]
      }
    }
  ]
};

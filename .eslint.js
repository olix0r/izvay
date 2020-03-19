module.exports = {
  parser: "@typescript-eslint/parser",
  extends: [
    "plugin:react/recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier/@typescript-eslint",
    "plugin:prettier/recommended"
  ],
  rules: {
    // Place to specify ESLint rules. Can be used to overwrite rules specified from the extended
    // configs e.g. "@typescript-eslint/explicit-function-return-type": "off",
  }
};

module.exports = {
  "env": {
    "es6": true,
    "node": true
  },
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "extends": ["airbnb-typescript"],
  "parserOptions": {
    "ecmaVersion": 2018,
    "project": "tsconfig.json"
  },
  "settings": {
        'import/extensions': [".js",".jsx",".ts",".tsx"],
        'import/parsers': {
          '@typescript-eslint/parser': [".ts",".tsx"]
        },
        'import/resolver': {
            'node': {
                'extensions': [".js",".jsx",".ts",".tsx"]
            }
        }
    }
 }


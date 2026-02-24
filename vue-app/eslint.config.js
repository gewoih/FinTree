import js from "@eslint/js";
import vue from "eslint-plugin-vue";
import tseslint from "typescript-eslint";

export default [
    js.configs.recommended,

    ...tseslint.configs.recommended,

    ...vue.configs["flat/recommended"],

    {
        files: ["**/*.vue"],
        languageOptions: {
            parserOptions: {
                parser: tseslint.parser,
            },
        },
        rules: {
            "vue/multi-word-component-names": "off",
            "vue/no-v-html": "off",
        },
    },

    {
        files: ["src/**/*.{ts,vue}"],
        rules: {
            "max-lines": [
                "error",
                {
                    max: 500,
                    skipBlankLines: true,
                    skipComments: true,
                },
            ],
        },
    },
    {
        files: ["src/**/*.ts"],
        rules: {
            "max-lines-per-function": [
                "error",
                {
                    max: 400,
                    skipBlankLines: true,
                    skipComments: true,
                    IIFEs: true,
                },
            ],
        },
    },

    {
        ignores: ["dist", "node_modules"],
    },
];

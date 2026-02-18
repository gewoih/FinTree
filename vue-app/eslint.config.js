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
        ignores: ["src/ui/**"],
        rules: {
            "no-restricted-imports": [
                "error",
                {
                    patterns: [
                        {
                            group: [
                                "primevue/*",
                                "!primevue/config",
                                "!primevue/toastservice",
                                "!primevue/confirmationservice",
                                "!primevue/tooltip",
                                "!primevue/usetoast",
                                "!primevue/useconfirm",
                                "!primevue/menuitem",
                            ],
                            message: "Import PrimeVue visual components via src/ui wrappers.",
                        },
                    ],
                },
            ],
        },
    },

    {
        ignores: ["dist", "node_modules"],
    },
];

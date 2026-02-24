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
                                "!primevue/toast",
                                "!primevue/confirmdialog",
                                "!primevue/usetoast",
                                "!primevue/useconfirm",
                                "!primevue/chart",
                                "!primevue/checkbox",
                                "!primevue/dialog",
                                "!primevue/datepicker",
                                "!primevue/drawer",
                                "!primevue/inputnumber",
                                "!primevue/inputtext",
                                "!primevue/message",
                                "!primevue/menu",
                                "!primevue/paginator",
                                "!primevue/select",
                                "!primevue/selectbutton",
                                "!primevue/skeleton",
                                "!primevue/tag",
                                "!primevue/toggleswitch",
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

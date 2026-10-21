import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const config = [
  { ignores: [".next/**", "mobile/**", "public/sw.js"] },
  ...compat.extends("next/core-web-vitals"),
];

export default config;

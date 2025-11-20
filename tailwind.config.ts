import type { Config } from "tailwindcss";
    const config: Config = {
      content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
      theme: { extend: { backgroundImage: { "gradient-radial": "radial-gradient(var(--tw-gradient-stops))" } } },
      plugins: [],
    }; export default config;
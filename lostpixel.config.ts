import type { CustomProjectConfig } from "lost-pixel";

export const config: CustomProjectConfig = {
  pageShots: {
    pages: [
      { path: "/", name: "home" },
      { path: "/about", name: "about" },
      { path: "/features", name: "features" },
      { path: "/pricing", name: "pricing" },
      { path: "/login", name: "login" },
      { path: "/register", name: "register" },
    ],
    baseUrl: "http://localhost:3000",
  },
  generateOnly: true,
  failOnDifference: true,
};

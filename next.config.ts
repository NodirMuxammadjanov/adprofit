import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // Worker-only deps must not be bundled into the Next server build.
  serverExternalPackages: ["pg", "pg-boss"],
};

export default withNextIntl(nextConfig);

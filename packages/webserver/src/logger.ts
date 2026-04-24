import { Logger } from "tslog";

const isProd = process.env.NODE_ENV === "production";

export const log = new Logger({
  name: "webserver",
  type: isProd ? "json" : "pretty",
  minLevel: isProd ? 3 : 0, // info+ in prod, trace+ in dev
});

import { createRequestHandler } from "./createRequestHandler";

export const handler = createRequestHandler({
  build: require("./build"),
});

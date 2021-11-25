import { URL } from "url";
import { Headers as NodeHeaders, Request as NodeRequest, formatServerError } from "@remix-run/node";
import type { CloudFrontRequestEvent, CloudFrontRequestHandler, CloudFrontHeaders } from "aws-lambda";
import type { AppLoadContext, ServerBuild, ServerPlatform } from "@remix-run/server-runtime";
import { createRequestHandler as createRemixRequestHandler } from "@remix-run/server-runtime";
import type { Response as NodeResponse } from "@remix-run/node";
import { installGlobals } from "@remix-run/node";

installGlobals();

/**
 * A function that returns the value to use as `context` in route `loader` and
 * `action` functions.
 *
 * You can think of this as an escape hatch that allows you to pass
 * environment/platform-specific values through to your loader/action.
 */
export interface GetLoadContextFunction {
  (event: CloudFrontRequestEvent): AppLoadContext;
}

export type RequestHandler = ReturnType<typeof createRequestHandler>;

/**
 * Returns a request handler for CloudFront Lambda-at-Edge that serves the response using
 * Remix.
 */
export function createRequestHandler({
  build,
  getLoadContext,
  mode = process.env.NODE_ENV,
}: {
  build: ServerBuild;
  getLoadContext?: GetLoadContextFunction;
  mode?: string;
}): CloudFrontRequestHandler {
  let platform: ServerPlatform = { formatServerError };
  let handleRequest = createRemixRequestHandler(build, platform, mode);

  return async (event, _context) => {
    let request = createRemixRequest(event);

    console.log(JSON.stringify(request))

    let loadContext = typeof getLoadContext === "function" ? getLoadContext(event) : undefined;

    let response = (await handleRequest(request as unknown as Request, loadContext)) as unknown as NodeResponse;

    return {
      status: String(response.status),
      headers: createCloudFrontHeaders(response.headers),
      bodyEncoding: "base64",
      body: Buffer.from(await response.text()).toString("base64"),
    };
  };
}

export function createRemixHeaders(requestHeaders: CloudFrontHeaders): NodeHeaders {
  let headers = new NodeHeaders();

  for (let [key, values] of Object.entries(requestHeaders)) {
    for (let { value } of values) {
      if (value) {
        headers.append(key, value);
      }
    }
  }

  return headers;
}

export function createCloudFrontHeaders(responseHeaders: NodeHeaders): CloudFrontHeaders {
  let headers: CloudFrontHeaders = {};

  responseHeaders.forEach((value, key) => {
    headers[key] = [...(headers[key] || []), { key: key, value }];
  });

  return headers;
}

export function createRemixRequest(event: CloudFrontRequestEvent): NodeRequest {
  const request = event.Records[0].cf.request;

  console.log(JSON.stringify(request));

  let host = request.headers["host"] ? request.headers["host"][0].value : undefined;
  let search = request.querystring.length ? `?${request.querystring}` : "";
  let url = new URL(request.uri + search, `https://${host}`);

  console.log(url.toString());

  return new NodeRequest(url.toString(), {
    method: request.method,
    headers: createRemixHeaders(request.headers),
    body: request.body?.data
      ? request.body.encoding === "base64"
        ? Buffer.from(request.body.data, "base64").toString()
        : request.body.data
      : undefined,
  });
}

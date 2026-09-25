import { createServer } from "node:http";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const types = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm" };
createServer(async (request, response) => {
  const pathname = new URL(request.url, "http://localhost").pathname;
  if (!/^\/(dist\/[\w.-]+|test\/browser\.html)$/.test(pathname)) {
    response.writeHead(404).end();
    return;
  }
  try {
    const file = new URL(`.${pathname}`, root);
    const extension = pathname.slice(pathname.lastIndexOf("."));
    const contents = await readFile(file);
    response.writeHead(200, { "Content-Type": types[extension] });
    response.end(contents);
  } catch {
    response.writeHead(404).end();
  }
}).listen(4173, "127.0.0.1");

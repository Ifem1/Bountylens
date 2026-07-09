import http from "http";
const TARGET = process.env.REDIRECT_TARGET || "https://bountylens-livid.vercel.app";
const port = parseInt(process.env.PORT || "3100", 10);
http.createServer((req, res) => {
  const url = TARGET + (req.url === "/" ? "" : req.url);
  res.writeHead(302, { Location: url });
  res.end();
}).listen(port, () => console.log("redirect server :" + port + " -> " + TARGET));

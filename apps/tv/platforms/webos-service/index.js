// webOS JS service (Node 8 on webOS 5, so plain ES5/ES2017 and http/https).
// The app calls luna://com.afu.iptv.service/fetch { url } when a direct
// request is refused by CORS and gets { status, body } back.
var Service = require("webos-service");
var http = require("http");
var https = require("https");
var urlLib = require("url");

var service = new Service("com.afu.iptv.service");
var MAX_REDIRECTS = 5;
var TIMEOUT_MS = 30000;

function get(target, hops, done) {
  var options = urlLib.parse(target);
  options.headers = {
    "User-Agent": "Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0 Safari/537.36",
    Accept: "application/json, text/plain, */*",
  };
  options.timeout = TIMEOUT_MS;
  var lib = options.protocol === "https:" ? https : http;
  var request = lib.get(options, function (response) {
    var location = response.headers.location;
    if (response.statusCode >= 300 && response.statusCode < 400 && location && hops < MAX_REDIRECTS) {
      response.resume();
      return get(urlLib.resolve(target, location), hops + 1, done);
    }
    var chunks = [];
    response.on("data", function (chunk) {
      chunks.push(chunk);
    });
    response.on("end", function () {
      done(null, response.statusCode, Buffer.concat(chunks).toString("utf8"));
    });
    response.on("error", done);
  });
  request.on("timeout", function () {
    request.abort();
    done(new Error("timeout"));
  });
  request.on("error", done);
}

service.register("fetch", function (message) {
  var target = message.payload && message.payload.url;
  if (typeof target !== "string" || !/^https?:\/\//i.test(target)) {
    return message.respond({ returnValue: false, errorText: "url must be http(s)" });
  }
  var answered = false;
  get(target, 0, function (error, status, body) {
    if (answered) return;
    answered = true;
    if (error) return message.respond({ returnValue: false, errorText: String(error.message || error) });
    message.respond({ returnValue: true, status: status, body: body });
  });
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { createSearchIndex, matchesSearch } from "./search.ts";

test("matchesSearch is Turkish- and separator-tolerant", () => {
  assert.ok(matchesSearch("Habertürk Demo", "haberturk"));
  assert.ok(matchesSearch("İzmir TV", "izmir"));
  assert.ok(matchesSearch("ISTANBUL", "istanbul"));
  assert.ok(matchesSearch("Çocuk Kanalı", "COCUK KANALI"));
  assert.ok(matchesSearch("TR | TRT 1 HD", "trt1"));
  assert.ok(matchesSearch("TV8 Demo", "tv 8"));
  assert.ok(!matchesSearch("NTV Demo", "trt"));
});

test("createSearchIndex folds names once and honours the limit", () => {
  const search = createSearchIndex(["TRT 1 HD", "TRT Haber", "Show TV"], (name) => name);
  assert.deepEqual(search("trt"), ["TRT 1 HD", "TRT Haber"]);
  assert.deepEqual(search("trt", 1), ["TRT 1 HD"]);
  assert.deepEqual(search("  "), []);
});

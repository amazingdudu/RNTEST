import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

try {
  const { expo: config } = JSON.parse(
    await readFile(new URL("../app.json", import.meta.url), "utf8"),
  );
  const endpoint = process.env.OTA_VERIFY_URL ?? config.updates.url;
  for (const platform of ["android", "ios"]) {
    const response = await fetch(endpoint, {
      headers: {
        "expo-protocol-version": "1",
        "expo-platform": platform,
        "expo-runtime-version": config.runtimeVersion,
        accept: "multipart/mixed",
      },
      signal: AbortSignal.timeout(30000),
    });
    assert.equal(
      response.status,
      200,
      `${platform}: manifest HTTP ${response.status}: ${await response.clone().text()}`,
    );
    assert.equal(response.headers.get("expo-protocol-version"), "1");
    const contentType = response.headers.get("content-type") ?? "";
    assert.match(contentType, /multipart\/mixed/);
    const body = await response.text();
    // The existing example server sends each JSON MIME part on a single line.
    const manifestLine = body
      .split(/\r?\n/)
      .find((line) => line.startsWith("{") && line.includes('"launchAsset"'));
    assert.ok(manifestLine, `${platform}: no normal update manifest found`);
    const manifest = JSON.parse(manifestLine);
    const message = manifest.extra?.updateInfo?.message;
    if (message !== undefined) assert.equal(typeof message, "string");
    if (process.env.OTA_EXPECT_MESSAGE !== undefined) {
      assert.equal(
        message,
        process.env.OTA_EXPECT_MESSAGE,
        "Update message mismatch",
      );
    }
    console.log(`${platform}: update message: ${message || "(none)"}`);
    assert.equal(manifest.runtimeVersion, config.runtimeVersion);
    assert.match(manifest.id, /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i);
    assert.ok(Number.isFinite(Date.parse(manifest.createdAt)));
    for (const asset of [manifest.launchAsset, ...manifest.assets]) {
      const url = new URL(asset.url);
      assert.equal(
        url.origin,
        new URL(endpoint).origin,
        "Asset URL host differs: check server HOSTNAME",
      );
      const download = await fetch(url, { signal: AbortSignal.timeout(30000) });
      assert.equal(
        download.status,
        200,
        `${platform}: asset HTTP ${download.status}: ${url}`,
      );
      const bytes = Buffer.from(await download.arrayBuffer());
      assert.equal(
        createHash("sha256").update(bytes).digest("base64url"),
        asset.hash,
        "Asset hash mismatch",
      );
    }
    console.log(
      `${platform}: manifest + ${manifest.assets.length + 1} assets verified (${manifest.id})`,
    );
    const same = await fetch(endpoint, {
      headers: {
        "expo-protocol-version": "1",
        "expo-platform": platform,
        "expo-runtime-version": config.runtimeVersion,
        "expo-current-update-id": manifest.id,
        accept: "multipart/mixed",
      },
      signal: AbortSignal.timeout(30000),
    });
    assert.equal(same.status, 200);
    assert.match(await same.text(), /noUpdateAvailable/);
    console.log(`${platform}: current update returns noUpdateAvailable`);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

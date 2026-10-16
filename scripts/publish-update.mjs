import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import {
  cp,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
function option(name, fallback) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  if (!args[index + 1] || args[index + 1].startsWith("--"))
    throw new Error(`${name} requires a value`);
  return args[index + 1];
}
function expo(args, capture = false) {
  const result = spawnSync("npx", ["--no-install", "expo", ...args], {
    cwd: root,
    encoding: "utf8",
    stdio: capture ? ["ignore", "pipe", "inherit"] : "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(`expo ${args[0]} failed (${result.status})`);
  return result.stdout;
}

try {
  const message = option("--message", "").trim();
  if (message.length > 4000)
    throw new Error("Update message must be at most 4000 characters");
  const config = JSON.parse(
    expo(["config", "--type", "public", "--json"], true),
  );
  const configuredUpdatesUrl = config.updates?.url;
  const remoteUrl = option(
    "--server-url",
    process.env.OTA_PUBLISH_URL ??
      (typeof configuredUpdatesUrl === "string"
        ? new URL(configuredUpdatesUrl).origin
        : ""),
  );
  if (!remoteUrl)
    throw new Error("Set OTA_PUBLISH_URL or configure expo.updates.url before publishing");
  const runtime = config.runtimeVersion;
  if (
    typeof runtime !== "string" ||
    !/^[A-Za-z0-9._-]+$/.test(runtime) ||
    runtime === "." ||
    runtime === ".."
  ) {
    throw new Error(
      "This publisher requires an explicit runtimeVersion string in app.json",
    );
  }
  // Both platforms must be included: the existing server chooses the latest directory per runtime.
  const output = path.resolve(root, option("--export-dir", "dist"));
  if (!args.includes("--skip-export"))
    expo(["export", "--platform", "all", "--output-dir", output]);
  const metadata = JSON.parse(
    await readFile(path.join(output, "metadata.json"), "utf8"),
  );
  for (const platform of ["android", "ios"]) {
    const entry = metadata.fileMetadata?.[platform];
    if (!entry?.bundle || !Array.isArray(entry.assets))
      throw new Error(`Missing ${platform} export`);
    for (const file of [
      entry.bundle,
      ...entry.assets.map((asset) => asset.path),
    ]) {
      const resolved = path.resolve(output, file);
      if (!resolved.startsWith(output + path.sep))
        throw new Error("Invalid export asset path");
      await stat(resolved);
    }
  }
  const release = String(Date.now());
  // Include release information in the hashed metadata so each publication has its own ID.
  const updateInfo = {
    message,
    publishedAt: new Date(Number(release)).toISOString(),
    release,
  };
  const metadataJson = JSON.stringify({ ...metadata, updateInfo });
  const expoConfigJson = JSON.stringify(config);

  if (remoteUrl) {
    const username = process.env.OTA_USERNAME;
    const password = process.env.OTA_PASSWORD;
    if (!username || !password)
      throw new Error("Set OTA_USERNAME and OTA_PASSWORD for publishing");
    const slug = String(config.slug ?? "").toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]{1,79}$/.test(slug))
      throw new Error("Expo config slug must be 2-80 lowercase letters, digits, or hyphens");
    const parsedUrl = new URL(remoteUrl);
    if (
      parsedUrl.protocol !== "https:" &&
      !["localhost", "127.0.0.1", "::1"].includes(parsedUrl.hostname)
    ) {
      throw new Error("Remote publishing requires HTTPS outside localhost");
    }
    if (parsedUrl.username || parsedUrl.password || parsedUrl.search || parsedUrl.hash) {
      throw new Error("OTA_PUBLISH_URL must not contain credentials, a query, or a fragment");
    }
    const temporaryDirectory = await mkdtemp(path.join(tmpdir(), "rntest-ota-"));
    const packageDirectory = path.join(temporaryDirectory, "package");
    const archivePath = path.join(temporaryDirectory, "update.tar.gz");
    try {
      await cp(output, packageDirectory, { recursive: true });
      await writeFile(path.join(packageDirectory, "metadata.json"), metadataJson);
      await writeFile(
        path.join(packageDirectory, "release.json"),
        JSON.stringify(updateInfo, null, 2),
      );
      await writeFile(path.join(packageDirectory, "expoConfig.json"), expoConfigJson);
      const archive = spawnSync(
        "tar",
        ["-czf", archivePath, "-C", packageDirectory, "."],
        {
          encoding: "utf8",
          env: { ...process.env, COPYFILE_DISABLE: "1" },
        },
      );
      if (archive.error) throw archive.error;
      if (archive.status !== 0)
        throw new Error(`Could not create update archive: ${archive.stderr}`);

      const url = `${parsedUrl.origin}/api/publish`;
      const [archiveStat, archiveHash] = await Promise.all([
        stat(archivePath),
        hashFile(archivePath),
      ]);
      const loginResponse = await fetch(`${parsedUrl.origin}/api/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
        signal: AbortSignal.timeout(30_000),
      });
      const login = await loginResponse.json().catch(() => ({}));
      if (!loginResponse.ok || typeof login.token !== "string") {
        throw new Error(login.error ?? `Login failed (${loginResponse.status})`);
      }
      const response = await fetch(url, {
        method: "POST",
        headers: {
          authorization: `Bearer ${login.token}`,
          "x-app-slug": slug,
          "content-type": "application/gzip",
          "content-length": String(archiveStat.size),
          "x-archive-sha256": archiveHash,
        },
        body: createReadStream(archivePath),
        duplex: "half",
        signal: AbortSignal.timeout(15 * 60 * 1000),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error ?? `Remote publish failed (${response.status})`);
      }
      console.log(`Uploaded ${slug} ${runtime} for review: ${body.directory ?? url}`);
    } finally {
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  }
  console.log(`Update message: ${message || "(none)"}`);
  console.log("Verify the published update with npm run ota:verify.");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

function hashFile(filename) {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(filename);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

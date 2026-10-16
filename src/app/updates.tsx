import { Stack } from "expo-router";
import * as Updates from "expo-updates";
import { useRef, useState } from "react";
import { Button, Platform, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";

function getUpdateMessage(manifest: unknown): string {
  if (!manifest || typeof manifest !== "object" || !("extra" in manifest))
    return "";
  const extra = manifest.extra;
  if (!extra || typeof extra !== "object" || !("updateInfo" in extra))
    return "";
  const info = extra.updateInfo;
  return info &&
    typeof info === "object" &&
    "message" in info &&
    typeof info.message === "string"
    ? info.message.trim()
    : "";
}

export default function UpdatesScreen() {
  const updates = Updates.useUpdates();
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);
  const lock = useRef(false);
  const enabled = Platform.OS !== "web" && !__DEV__ && Updates.isEnabled;
  const busy =
    working ||
    updates.isStartupProcedureRunning ||
    updates.isChecking ||
    updates.isDownloading ||
    updates.isRestarting;
  const pendingUpdate = updates.isUpdatePending
    ? updates.downloadedUpdate
    : updates.availableUpdate;
  const availableMessage = getUpdateMessage(pendingUpdate?.manifest);
  const currentMessage = getUpdateMessage(updates.currentlyRunning.manifest);

  async function run(action: () => Promise<void>) {
    if (!enabled || busy || lock.current) return;
    lock.current = true;
    setWorking(true);
    setMessage("");
    try {
      await action();
    } catch (error) {
      setMessage(
        `更新失败：${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      lock.current = false;
      setWorking(false);
    }
  }

  const status = updates.isRestarting
    ? "正在重启…"
    : updates.isDownloading
      ? `正在下载… ${Math.round((updates.downloadProgress ?? 0) * 100)}%`
      : updates.isChecking
        ? "正在检查更新…"
        : updates.isStartupProcedureRunning
          ? "正在完成启动更新检查…"
          : updates.isUpdatePending
            ? "更新已下载，可重启生效，也可下次启动时使用。"
            : updates.isUpdateAvailable
              ? "发现可用更新。"
              : "可手动检查更新。";

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: "应用更新" }} />
      <SafeAreaView
        edges={["left", "right", "bottom"]}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="subtitle">应用更新</ThemedText>
          <ThemedText>
            运行版本：{Updates.runtimeVersion ?? "开发环境"}
          </ThemedText>
          <ThemedText>
            来源：
            {!enabled
              ? "开发预览"
              : updates.currentlyRunning.isEmbeddedLaunch
                ? "安装包内置版本"
                : "在线更新"}
          </ThemedText>
          <ThemedText selectable>
            更新 ID：{Updates.updateId ?? "无"}
          </ThemedText>
          {currentMessage ? (
            <ThemedText selectable>当前版本说明：{currentMessage}</ThemedText>
          ) : null}
          {enabled ? (
            <>
              <ThemedText accessibilityLiveRegion="polite">{status}</ThemedText>
              {pendingUpdate ? (
                <ThemedView
                  type="backgroundElement"
                  style={styles.releaseNotes}
                >
                  <ThemedText type="smallBold">更新内容</ThemedText>
                  <ThemedText selectable>
                    {availableMessage || "本次更新未提供说明。"}
                  </ThemedText>
                </ThemedView>
              ) : null}
              <Button
                title="检查更新"
                disabled={busy || updates.isUpdatePending}
                onPress={() =>
                  void run(async () => {
                    const result = await Updates.checkForUpdateAsync();
                    setMessage(
                      result.isAvailable || result.isRollBackToEmbedded
                        ? "发现可用更新，请点击下载。"
                        : "当前没有可用的新更新。",
                    );
                  })
                }
              />
              {updates.isUpdateAvailable && !updates.isUpdatePending ? (
                <Button
                  title="下载更新"
                  disabled={busy}
                  onPress={() =>
                    void run(async () => {
                      const result = await Updates.fetchUpdateAsync();
                      setMessage(
                        result.isNew || result.isRollBackToEmbedded
                          ? "下载完成，可重启生效。"
                          : "未下载到新更新，请重试检查。",
                      );
                    })
                  }
                />
              ) : null}
              {updates.isUpdatePending ? (
                <Button
                  title="重启并应用更新"
                  disabled={busy}
                  onPress={() =>
                    void run(async () => {
                      await Updates.reloadAsync();
                    })
                  }
                />
              ) : null}
              {updates.checkError || updates.downloadError ? (
                <ThemedText selectable>
                  最近更新错误：
                  {(updates.checkError ?? updates.downloadError)?.message}
                </ThemedText>
              ) : null}
            </>
          ) : (
            <ThemedText>
              热更新需要在启用 expo-updates 的 Release 安装包中验证，Metro
              开发模式和 Web 预览不执行此操作。
            </ThemedText>
          )}
          {message ? (
            <ThemedText selectable accessibilityLiveRegion="polite">
              {message}
            </ThemedText>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.three },
  releaseNotes: {
    padding: Spacing.three,
    gap: Spacing.two,
    borderRadius: Spacing.two,
  },
});

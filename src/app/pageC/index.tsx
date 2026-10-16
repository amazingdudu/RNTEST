import { Stack, router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useRef, useState } from "react";
import { BackHandler, Pressable, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

export default function PageC() {
  const [title, setTitle] = useState("加载中…");
  const [canGoBack, setCanGoBack] = useState(false);
  const webViewRef = useRef<WebView>(null);

  const handleBack = useCallback(() => {
    if (canGoBack && webViewRef.current) {
      webViewRef.current.goBack();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  }, [canGoBack]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          handleBack();
          return true;
        },
      );
      return () => subscription.remove();
    }, [handleBack]),
  );

  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={styles.container}>
      <Stack.Screen
        options={{
          title,
          headerStyle: { backgroundColor: "#FF0000" },
          headerTintColor: "#FFFFFF",
          gestureEnabled: !canGoBack,
          headerLeft: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="返回"
              onPress={handleBack}
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.backText}>‹ 返回</Text>
            </Pressable>
          ),
        }}
      />
      <StatusBar style="dark" />

      <WebView
        ref={webViewRef}
        style={styles.container}
        source={{ uri: "https://www.google.com/" }}
        startInLoadingState
        onNavigationStateChange={(navState) => {
          setCanGoBack(navState.canGoBack);
          setTitle(navState.title?.trim() || "网页");
        }}
        onError={({ nativeEvent }) => {
          console.warn("网页加载失败:", nativeEvent.description);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backButton: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: "center",
    paddingRight: 12,
  },
  backText: {
    color: "#FFFFFF",
    fontSize: 17,
  },
  pressed: {
    opacity: 0.6,
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
    // width: "50%",
  },
});

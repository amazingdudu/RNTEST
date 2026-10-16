import { Stack, router } from "expo-router";
import { Button, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// import { WebView } from "react-native-webview";

export default function PageB() {
  return (
    <SafeAreaView style={styles.container}>
      {/* 隐藏系统导航栏 */}
      <Stack.Screen options={{ headerShown: false }} />

      {/* 自定义导航栏 */}
      <View style={styles.header}>
        <View style={styles.side}>
          <Button
            title="<"
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace("/");
              }
            }}
          />
        </View>

        <Text style={styles.title}>页面 B</Text>

        {/* 左右等宽，使标题居中 */}
        <View style={styles.side} />
      </View>

      <View style={styles.content}>
        <Text>页面内容</Text>
      </View>
      {/* <WebView
        style={styles.container}
        source={{ uri: "https://expo.dev" }}
        startInLoadingState
        onError={({ nativeEvent }) => {
          console.warn("网页加载失败:", nativeEvent.description);
        }}
      />
      <WebView
        style={styles.container}
        source={{ uri: "https://expo.dev" }}
        startInLoadingState
        onError={({ nativeEvent }) => {
          console.warn("网页加载失败:", nativeEvent.description);
        }}
      /> */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ddd",
  },
  side: {
    width: 80,
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    padding: 16,
  },
});

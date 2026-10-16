# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

## 本地热更新（自建服务）

客户端使用 `expo-updates`，更新地址为 `http://localhost:3000/api/manifest`，
当前原生兼容版本为 `native-1`。首页的「应用更新」可查看当前 update ID、
检查更新、下载进度、错误信息，并选择重启生效。启动时仍由原生层自动检查并后台下载；
不自动重启打断用户，下载完后下次冷启动生效，或进入更新页主动重启。

### 1. 启动已有更新服务

```bash
cd /Users/shaoyang/practice/custom-expo-updates-server/expo-updates-server
HOSTNAME=http://localhost:3000 npm run dev -- --port 3000
```

这里的 `HOSTNAME` 必须包含协议和端口，服务端用它生成所有资源 URL。
已有服务占用 3000 时不要再启动第二个实例；确认那个实例的 HOSTNAME 正确即可。
服务端原来的 `expo-publish` 脚本指向示例客户端，请使用 RNTEST 下方的新命令。

更新服务器现在使用 MySQL 保存应用、用户、更新审核状态和操作审计。首次启动前，在服务端配置：

```bash
DATABASE_URL='mysql://ota_user:数据库密码@127.0.0.1:3306/expo_updates' \
OTA_SESSION_SECRET='至少 32 个随机字符的会话密钥' \
OTA_ADMIN_USERNAME='admin' \
OTA_ADMIN_PASSWORD='至少 12 位的初始管理员密码' \
OTA_DEFAULT_APP_SLUG='rntest' \
OTA_DEFAULT_APP_NAME='RNTEST' \
HOSTNAME=http://localhost:3000 npm run dev -- --port 3000
```

服务会自动创建所需表，并把旧 `updates/<runtime>/<release>` 目录导入默认应用为已发布记录，保留当前客户端可用的更新。管理员通过 `/login` 登录并在「用户管理」中新建账号；没有自助注册。管理员可管理应用和用户，发布者可上传及审核更新。生产环境请使用 HTTPS、强随机密钥和独立的最小权限 MySQL 用户，不要把密码提交到 Git。反向代理仍需允许最大 512 MB 请求体和足够长的上传超时。

### 2. 安装一次基准 Release 包

```bash
# 在 RNTEST 根目录；Android USB 真机/模拟器转发更新端口
adb reverse tcp:3000 tcp:3000
npm run android:release
```

此命令是本地测试签名的 Release 包，不是商店发布签名。开发时的 Metro Fast Refresh
不等于 OTA；Expo Go、Web 和普通 Debug 模式不能验证这里的更新按钮。
目前 Android 原生配置已包含同一个更新 URL 和 runtime。
如果以后修改 app.json 的原生配置，需要通过 Expo Prebuild 同步并重建安装包。
重新生成前应把手动修改的 Maven 镜像等配置迁入 config plugin，避免丢失。

iPhone 真机不能通过 Android 的 adb reverse 访问服务。需将 app.json 更新地址和
服务端 HOSTNAME 一起改为可达的局域网 IP 或 HTTPS 域名，再构建 iOS Release 包。
iOS 原生目录由 Expo 生成，不能手工创建。

### 3. 发布本项目更新

修改 JS/TS、页面或资源后，在 RNTEST 根目录运行：

```bash
npm run ota:publish -- --message "修复网页返回问题，优化首页样式"
```

脚本使用本项目安装的 Expo CLI 导出 Android/iOS/Web，验证 Android/iOS bundle 和资源齐全，
将 Expo 配置和更新说明打包为 `.tar.gz`，通过登录会话上传到服务端。上传后状态为「待审核」，
客户端仍会收到此前已确认发布的版本。管理员或发布者在后台进入应用，确认发布后新版本才对客户端生效。

更新说明可选，支持中文和换行，最多 4000 字符。每次上传保存 `release.json`，并将说明写入
`metadata.json` 的 `updateInfo`；服务端通过 `manifest.extra.updateInfo` 返回，App 在发现/下载更新时展示。
旧更新没有说明时显示兜底文案，重启后可查看当前版本说明。发布元数据也参与 update ID 计算，
所以同一 bundle 重新发布不同说明也会得到独立的更新 ID。

CLI 使用管理员在后台创建的账号登录；可通过环境变量传入，避免脚本提示时交互输入：

```bash
OTA_PUBLISH_URL=https://updates.example.com \
OTA_USERNAME='publisher' \
OTA_PASSWORD='<管理员创建用户时设置的初始密码>' \
npm run ota:publish -- --message "修复网页返回问题，优化首页样式"
```

未设置 `OTA_PUBLISH_URL` 时，脚本使用 Expo `updates.url` 的服务器地址。客户端上传归档的
SHA-256，服务端在解压前重新计算并比对；校验通过后写入待审核目录和 MySQL 记录，不会自动生效。
客户端读取 manifest 和资源仍是公开接口。

后台操作：应用列表支持新建、编辑和停用应用；点击应用可查看待审核与历史更新。确认发布后
manifest 只返回该应用、该 Runtime 最新的已发布版本。撤回故障更新后，服务会自动回到此前仍有效的
已发布版本；已经应用故障包的用户需要再发布一个兼容同 Runtime 的修复包。已发布资源保留，避免
正在下载的客户端因资源删除失败。每个新 Expo 应用的 `updates.url` 要带 `?app=<应用标识>`，
例如 `https://updates.example.com/api/manifest?app=shop`，并重新构建原生包以写入该应用路由。

若已经导出，可以跳过再次打包（仅限确认 dist 来自当前代码、原生配置一致时）：

```bash
npm run ota:publish -- --skip-export
```

### 4. 验证发布与应用

```bash
npm run ota:verify
```

此命令分别检查 Android/iOS manifest、runtime、资源 URL、全部资源的 SHA-256，
并确认当前 update ID 再请求会返回 noUpdateAvailable。
它验证服务协议和下载链路，不替代真机上的 bundle 启动验证。

安装基准包后修改一处可见文案并发布；在 App 的「应用更新」中检查、下载、重启，
确认新文案和 update ID。还应验证断网时仍能进入应用，重试后可下载，
下载但不重启时不打断当前页面，下次冷启动使用新版本。

### 兼容性与上线

- Kotlin/Swift、自定义 MyModule、新增或升级原生依赖、权限等变更，必须更新 runtimeVersion
  （例如 native-2）并构建新安装包；旧包继续使用 native-1 的兼容更新。
- 已发布错误 JS 时，可修复后再次发布相同 runtime 的较新更新；不要直接覆盖旧资源。
- 该服务是官方示例衍生的本地验证服务；生产发布需使用 HTTPS、私有签名密钥及客户端证书，
  并保护更新发布权限。当前本地 HTTP 配置和示例公用密钥不作为生产方案。
- 只有确认服务端支持安全、不可变资源及回滚后，再将它用于正式分发。

### Android commands

- `npm run android`: 编译并安装开发应用。
- `npm run android:release`: 本地编译安装 Release 包，用于 OTA 验证。
- `npm run android:go`: 启动 Metro 并打开已安装应用，仅改 JS/TS 时使用。

Android application ID 为 `com.rntest.app`。首次编译会下载 SDK 和 Gradle 依赖。

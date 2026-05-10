# LunchRoulette

一个不联网的 iOS 午餐轮盘 SwiftUI 示例应用。

## 功能

- 添加、编辑、停用午餐店铺或选项。
- 备注文本可以写普通文字，也可以粘贴地图、菜单、店铺页等链接。
- 数据保存在应用本地 Documents 目录的 `lunch-roulette.json`，不依赖网络。
- 抽中后自动记录当天去过该店铺。
- 抽取概率会随“没去的天数”增加：

```swift
effectiveWeight = baseWeight * (1 + min(daysSinceVisit, 30) * 0.18)
```

也就是说，越久没去的店铺越容易被抽中；刚抽中过的店铺会回到较低概率。

## 使用方式

1. 在 macOS 上用 Xcode 打开 `LunchRoulette.xcodeproj`。
2. 选择 iPhone 模拟器或真机。
3. 如需真机运行，把 Signing & Capabilities 里的 Team 和 Bundle Identifier 改成你自己的。
4. 运行 `LunchRoulette` target。

## 主要文件

- `LunchRouletteApp.swift`: 应用入口。
- `ContentView.swift`: 轮盘、抽取按钮、店铺列表和最近记录。
- `RestaurantEditorView.swift`: 添加和编辑店铺。
- `Models.swift`: 店铺、历史记录和颜色工具。
- `WeightedPicker.swift`: 权重计算后的随机抽取。
- `RouletteStore.swift`: 本地 JSON 读写和业务操作。

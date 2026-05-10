import SwiftUI

struct RestaurantEditorView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var store: RouletteStore

    let restaurant: Restaurant?

    @State private var name: String
    @State private var note: String
    @State private var colorHex: String
    @State private var baseWeight: Double
    @State private var isEnabled: Bool

    init(restaurant: Restaurant?) {
        self.restaurant = restaurant
        _name = State(initialValue: restaurant?.name ?? "")
        _note = State(initialValue: restaurant?.note ?? "")
        _colorHex = State(initialValue: restaurant?.colorHex ?? presetColors.randomElement()!)
        _baseWeight = State(initialValue: restaurant?.baseWeight ?? 1)
        _isEnabled = State(initialValue: restaurant?.isEnabled ?? true)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("店名", text: $name)

                    TextField("备注，可以粘贴地图或菜单链接", text: $note, axis: .vertical)
                        .lineLimit(3...6)
                }

                Section("基础概率") {
                    Stepper(value: $baseWeight, in: 0.5...5, step: 0.5) {
                        Text("基础权重 \(baseWeight, specifier: "%.1f")")
                    }

                    Text("未去天数会在这个基础上增加概率，最多计算 30 天。")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Section("颜色") {
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 4), spacing: 12) {
                        ForEach(presetColors, id: \.self) { color in
                            Button {
                                colorHex = color
                            } label: {
                                Circle()
                                    .fill(Color(hex: color))
                                    .frame(width: 34, height: 34)
                                    .overlay {
                                        if colorHex == color {
                                            Image(systemName: "checkmark")
                                                .font(.caption.weight(.bold))
                                                .foregroundStyle(.white)
                                        }
                                    }
                            }
                            .buttonStyle(.plain)
                            .accessibilityLabel("选择颜色")
                        }
                    }
                }

                Section {
                    Toggle("参与抽取", isOn: $isEnabled)

                    if let restaurant {
                        Button("清除上次去过日期") {
                            store.resetLastVisited(restaurant)
                            dismiss()
                        }
                    }
                }
            }
            .navigationTitle(restaurant == nil ? "添加店铺" : "编辑店铺")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("取消") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button("保存") {
                        save()
                    }
                    .disabled(name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
        }
    }

    private func save() {
        let trimmedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedNote = note.trimmingCharacters(in: .whitespacesAndNewlines)

        if var restaurant {
            restaurant.name = trimmedName
            restaurant.note = trimmedNote
            restaurant.colorHex = colorHex
            restaurant.baseWeight = baseWeight
            restaurant.isEnabled = isEnabled
            store.updateRestaurant(restaurant)
        } else {
            store.addRestaurant(name: trimmedName, note: trimmedNote, colorHex: colorHex, baseWeight: baseWeight)
        }

        dismiss()
    }
}

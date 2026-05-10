import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var store: RouletteStore
    @State private var pickedRestaurant: Restaurant?
    @State private var rotation = 0.0
    @State private var isShowingEditor = false
    @State private var restaurantToEdit: Restaurant?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    RouletteWheel(restaurants: store.restaurants, rotation: rotation)
                        .frame(maxWidth: 340)
                        .aspectRatio(1, contentMode: .fit)
                        .padding(.top, 20)

                    pickPanel
                    restaurantSection
                    historySection
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 32)
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("午餐轮盘")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        restaurantToEdit = nil
                        isShowingEditor = true
                    } label: {
                        Image(systemName: "plus")
                    }
                    .accessibilityLabel("添加店铺")
                }
            }
            .sheet(isPresented: $isShowingEditor) {
                RestaurantEditorView(restaurant: restaurantToEdit)
                    .environmentObject(store)
            }
        }
    }

    private var pickPanel: some View {
        VStack(spacing: 12) {
            if let pickedRestaurant {
                Text(pickedRestaurant.name)
                    .font(.system(size: 34, weight: .bold, design: .rounded))
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: .infinity)

                if !pickedRestaurant.note.isEmpty {
                    NoteLinksView(note: pickedRestaurant.note)
                }

                Text("已记录为今天去过，之后概率会先降低，再随未去天数慢慢升高。")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            } else {
                Text(store.restaurants.filter(\.isEnabled).isEmpty ? "先添加几个午餐选项" : "今天吃什么？")
                    .font(.system(size: 28, weight: .bold, design: .rounded))
                    .multilineTextAlignment(.center)
            }

            Button {
                withAnimation(.easeOut(duration: 1.0)) {
                    rotation += Double.random(in: 720...1440)
                }

                pickedRestaurant = store.pickToday()
            } label: {
                Label("开始抽取", systemImage: "sparkles")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
            }
            .buttonStyle(.borderedProminent)
            .disabled(store.restaurants.filter(\.isEnabled).isEmpty)
        }
        .padding(18)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
    }

    private var restaurantSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("店铺")
                    .font(.headline)

                Spacer()

                Text("概率随未去天数增加")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            ForEach(store.restaurants) { restaurant in
                Button {
                    restaurantToEdit = restaurant
                    isShowingEditor = true
                } label: {
                    RestaurantRow(restaurant: restaurant)
                }
                .buttonStyle(.plain)
                .contextMenu {
                    Button(role: .destructive) {
                        store.deleteRestaurant(restaurant)
                    } label: {
                        Label("删除", systemImage: "trash")
                    }
                }
            }
        }
    }

    private var historySection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("最近记录")
                .font(.headline)

            if store.history.isEmpty {
                Text("还没有抽取记录")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
            } else {
                ForEach(store.history.prefix(5)) { record in
                    HStack {
                        Text(record.restaurantName)
                            .font(.subheadline.weight(.medium))

                        Spacer()

                        Text(record.pickedAt, style: .date)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    .padding(.vertical, 4)
                }
            }
        }
        .padding(.top, 4)
    }
}

private struct RestaurantRow: View {
    let restaurant: Restaurant

    var body: some View {
        HStack(spacing: 12) {
            Circle()
                .fill(Color(hex: restaurant.colorHex))
                .frame(width: 14, height: 14)

            VStack(alignment: .leading, spacing: 4) {
                Text(restaurant.name)
                    .font(.body.weight(.semibold))
                    .foregroundStyle(.primary)

                Text("\(restaurant.visitStatusText()) · 当前权重 \(restaurant.effectiveWeight(), specifier: "%.1f")")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            if !restaurant.isEnabled {
                Image(systemName: "pause.circle")
                    .foregroundStyle(.secondary)
            }
        }
        .padding(12)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
    }
}

private struct RouletteWheel: View {
    let restaurants: [Restaurant]
    let rotation: Double

    var body: some View {
        GeometryReader { geometry in
            let diameter = min(geometry.size.width, geometry.size.height)

            ZStack {
                Canvas { context, size in
                    let segments = WeightedPicker.normalizedSegments(for: restaurants)
                    let rect = CGRect(origin: .zero, size: size)
                    let center = CGPoint(x: rect.midX, y: rect.midY)
                    let radius = min(size.width, size.height) / 2
                    var startAngle = Angle(degrees: -90)

                    if segments.isEmpty {
                        context.fill(
                            Path(ellipseIn: rect.insetBy(dx: 2, dy: 2)),
                            with: .color(Color(.tertiarySystemFill))
                        )
                        return
                    }

                    for segment in segments {
                        let endAngle = startAngle + Angle(degrees: 360 * segment.ratio)
                        var path = Path()
                        path.move(to: center)
                        path.addArc(center: center, radius: radius, startAngle: startAngle, endAngle: endAngle, clockwise: false)
                        path.closeSubpath()
                        context.fill(path, with: .color(Color(hex: segment.restaurant.colorHex)))
                        startAngle = endAngle
                    }
                }
                .clipShape(Circle())
                .shadow(color: .black.opacity(0.15), radius: 16, y: 8)
                .rotationEffect(.degrees(rotation))

                Circle()
                    .fill(.background)
                    .frame(width: min(82.0, diameter * 0.25), height: min(82.0, diameter * 0.25))
                    .shadow(color: .black.opacity(0.12), radius: 8, y: 3)

                Image(systemName: "fork.knife")
                    .font(.system(size: min(30.0, diameter * 0.09), weight: .bold))
                    .foregroundStyle(.primary)

                TrianglePointer()
                    .fill(Color(.label))
                    .frame(width: 24, height: 28)
                    .offset(y: -diameter / 2 + 14)
            }
            .frame(width: diameter, height: diameter)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }
}

private struct TrianglePointer: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        path.move(to: CGPoint(x: rect.midX, y: rect.maxY))
        path.addLine(to: CGPoint(x: rect.minX, y: rect.minY))
        path.addLine(to: CGPoint(x: rect.maxX, y: rect.minY))
        path.closeSubpath()
        return path
    }
}

private struct NoteLinksView: View {
    let note: String

    var body: some View {
        VStack(spacing: 8) {
            Text(note)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .textSelection(.enabled)

            ForEach(detectedURLs, id: \.self) { url in
                Link(destination: url) {
                    Label(url.host(percentEncoded: false) ?? url.absoluteString, systemImage: "link")
                        .font(.caption.weight(.medium))
                }
            }
        }
    }

    private var detectedURLs: [URL] {
        guard let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue) else {
            return []
        }

        let range = NSRange(note.startIndex..<note.endIndex, in: note)
        return detector.matches(in: note, range: range).compactMap(\.url)
    }
}

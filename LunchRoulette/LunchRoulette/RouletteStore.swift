import Foundation

final class RouletteStore: ObservableObject {
    @Published var restaurants: [Restaurant] = [] {
        didSet { save() }
    }

    @Published var history: [PickRecord] = [] {
        didSet { save() }
    }

    private let fileURL: URL
    private let encoder: JSONEncoder
    private let decoder: JSONDecoder
    private var isLoading = false

    init() {
        let documents = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
        self.fileURL = documents.appendingPathComponent("lunch-roulette.json")

        self.encoder = JSONEncoder()
        self.encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        self.encoder.dateEncodingStrategy = .iso8601

        self.decoder = JSONDecoder()
        self.decoder.dateDecodingStrategy = .iso8601

        load()
    }

    func addRestaurant(name: String, note: String, colorHex: String, baseWeight: Double) {
        let trimmedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedName.isEmpty else {
            return
        }

        restaurants.append(
            Restaurant(
                name: trimmedName,
                note: note.trimmingCharacters(in: .whitespacesAndNewlines),
                colorHex: colorHex,
                baseWeight: baseWeight
            )
        )
    }

    func updateRestaurant(_ restaurant: Restaurant) {
        guard let index = restaurants.firstIndex(where: { $0.id == restaurant.id }) else {
            return
        }

        restaurants[index] = restaurant
    }

    func deleteRestaurant(at offsets: IndexSet) {
        for index in offsets.sorted(by: >) {
            restaurants.remove(at: index)
        }
    }

    func deleteRestaurant(_ restaurant: Restaurant) {
        restaurants.removeAll { $0.id == restaurant.id }
    }

    @discardableResult
    func pickToday() -> Restaurant? {
        guard let picked = WeightedPicker.pick(from: restaurants) else {
            return nil
        }

        if let index = restaurants.firstIndex(where: { $0.id == picked.id }) {
            restaurants[index].lastVisitedAt = Date()
        }

        history.insert(PickRecord(restaurantID: picked.id, restaurantName: picked.name), at: 0)
        if history.count > 50 {
            history.removeLast(history.count - 50)
        }

        return restaurants.first(where: { $0.id == picked.id }) ?? picked
    }

    func resetLastVisited(_ restaurant: Restaurant) {
        guard let index = restaurants.firstIndex(where: { $0.id == restaurant.id }) else {
            return
        }

        restaurants[index].lastVisitedAt = nil
    }

    private func load() {
        isLoading = true
        defer { isLoading = false }

        guard FileManager.default.fileExists(atPath: fileURL.path) else {
            restaurants = Self.sampleRestaurants
            history = []
            return
        }

        do {
            let data = try Data(contentsOf: fileURL)
            let rouletteData = try decoder.decode(RouletteData.self, from: data)
            restaurants = rouletteData.restaurants
            history = rouletteData.history
        } catch {
            restaurants = Self.sampleRestaurants
            history = []
        }
    }

    private func save() {
        guard !isLoading else {
            return
        }

        do {
            let data = RouletteData(restaurants: restaurants, history: history)
            let encoded = try encoder.encode(data)
            try encoded.write(to: fileURL, options: [.atomic])
        } catch {
            assertionFailure("Failed to save lunch roulette data: \(error)")
        }
    }

    private static let sampleRestaurants: [Restaurant] = [
        Restaurant(name: "拉面", note: "例：https://maps.apple.com", colorHex: "#F97316", lastVisitedAt: Calendar.current.date(byAdding: .day, value: -3, to: Date())),
        Restaurant(name: "咖喱饭", note: "想吃辣的时候", colorHex: "#EAB308", lastVisitedAt: Calendar.current.date(byAdding: .day, value: -8, to: Date())),
        Restaurant(name: "定食", note: "稳定选择", colorHex: "#10B981", lastVisitedAt: Calendar.current.date(byAdding: .day, value: -1, to: Date())),
        Restaurant(name: "寿司", note: "预算高一点时", colorHex: "#3B82F6", lastVisitedAt: nil)
    ]
}

import Foundation

struct WeightedPicker {
    static func pick(from restaurants: [Restaurant], today: Date = Date()) -> Restaurant? {
        let candidates = restaurants.filter { $0.isEnabled }
        guard !candidates.isEmpty else {
            return nil
        }

        let weightedItems = candidates.map { restaurant in
            (restaurant, restaurant.effectiveWeight(today: today))
        }

        let totalWeight = weightedItems.reduce(0) { $0 + $1.1 }
        guard totalWeight > 0 else {
            return candidates.randomElement()
        }

        var threshold = Double.random(in: 0..<totalWeight)
        for (restaurant, weight) in weightedItems {
            threshold -= weight
            if threshold <= 0 {
                return restaurant
            }
        }

        return weightedItems.last?.0
    }

    static func normalizedSegments(for restaurants: [Restaurant], today: Date = Date()) -> [(restaurant: Restaurant, ratio: Double)] {
        let candidates = restaurants.filter { $0.isEnabled }
        let weights = candidates.map { ($0, $0.effectiveWeight(today: today)) }
        let totalWeight = weights.reduce(0) { $0 + $1.1 }

        guard totalWeight > 0 else {
            return []
        }

        return weights.map { ($0.0, $0.1 / totalWeight) }
    }
}

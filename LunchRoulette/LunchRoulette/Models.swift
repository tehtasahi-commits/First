import Foundation
import SwiftUI

struct Restaurant: Identifiable, Codable, Equatable {
    var id: UUID
    var name: String
    var note: String
    var colorHex: String
    var baseWeight: Double
    var lastVisitedAt: Date?
    var isEnabled: Bool

    init(
        id: UUID = UUID(),
        name: String,
        note: String = "",
        colorHex: String,
        baseWeight: Double = 1,
        lastVisitedAt: Date? = nil,
        isEnabled: Bool = true
    ) {
        self.id = id
        self.name = name
        self.note = note
        self.colorHex = colorHex
        self.baseWeight = baseWeight
        self.lastVisitedAt = lastVisitedAt
        self.isEnabled = isEnabled
    }
}

struct PickRecord: Identifiable, Codable, Equatable {
    var id: UUID
    var restaurantID: UUID
    var restaurantName: String
    var pickedAt: Date

    init(id: UUID = UUID(), restaurantID: UUID, restaurantName: String, pickedAt: Date = Date()) {
        self.id = id
        self.restaurantID = restaurantID
        self.restaurantName = restaurantName
        self.pickedAt = pickedAt
    }
}

struct RouletteData: Codable, Equatable {
    var restaurants: [Restaurant]
    var history: [PickRecord]
}

extension Restaurant {
    func daysSinceVisit(calendar: Calendar = .current, today: Date = Date()) -> Int {
        guard let lastVisitedAt else {
            return 30
        }

        let start = calendar.startOfDay(for: lastVisitedAt)
        let end = calendar.startOfDay(for: today)
        return max(calendar.dateComponents([.day], from: start, to: end).day ?? 0, 0)
    }

    func effectiveWeight(calendar: Calendar = .current, today: Date = Date()) -> Double {
        let days = min(daysSinceVisit(calendar: calendar, today: today), 30)
        return max(baseWeight, 0.1) * (1 + Double(days) * 0.18)
    }

    func visitStatusText(calendar: Calendar = .current, today: Date = Date()) -> String {
        guard lastVisitedAt != nil else {
            return "从未吃过"
        }

        let days = daysSinceVisit(calendar: calendar, today: today)
        if days == 0 {
            return "今天吃过"
        }

        return "未去 \(days) 天"
    }
}

extension Color {
    init(hex: String) {
        let sanitized = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var value: UInt64 = 0
        Scanner(string: sanitized).scanHexInt64(&value)

        let red = Double((value >> 16) & 0xFF) / 255
        let green = Double((value >> 8) & 0xFF) / 255
        let blue = Double(value & 0xFF) / 255

        self.init(red: red, green: green, blue: blue)
    }
}

let presetColors = [
    "#F97316",
    "#10B981",
    "#3B82F6",
    "#EF4444",
    "#A855F7",
    "#14B8A6",
    "#EAB308",
    "#EC4899"
]

import SwiftUI

@main
struct LunchRouletteApp: App {
    @StateObject private var store = RouletteStore()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(store)
        }
    }
}

import { AirportConnection, AirportConnectionStrategy, AirportConnections, ExtendedConnectionStrategy } from "./aiport-connection-strategy";
import { RouteLengthStrategy, RouteStrategy, ShortestRouteStrategy } from "./route-strategy";

import { Airport } from "../data/entities";
import { AirportProvider } from "../data/airport-provider";

const airport1 = new Airport("1", "A1", "A1", "A1", 0, 0);
const airport2 = new Airport("2", "A2", "A2", "A2", 0, 0);
const airport3 = new Airport("3", "A3", "A3", "A3", 0, 0);
const airport4 = new Airport("4", "A4", "A4", "A4", 0, 0);
const airport5 = new Airport("5", "A5", "A5", "A5", 0, 0);
const airport6 = new Airport("6", "A6", "A6", "A6", 0, 0);
const airport7 = new Airport("7", "A7", "A7", "A7", 0, 0);
const airport8 = new Airport("8", "A8", "A8", "A8", 0, 0);
const airport9 = new Airport("9", "A9", "A9", "A9", 0, 0);
const airport10 = new Airport("10", "A10", "A10", "A10", 0, 0);

class MockAirportConnectionStrategy implements AirportConnectionStrategy {
    private readonly connections: Record<string, Record<string, number>> = {
        "A1": { "A2": 500, "A3": 100 },
        "A2": { "A1": 500, "A6": 800, "A9": 1000 },
        "A3": { "A1": 100, "A4": 200, "A5": 600 },
        "A4": { "A3": 200, "A7": 300 },
        "A5": { "A3": 600, "A7": 800 },
        "A6": { "A2": 800, "A7": 500, "A8": 1200 },
        "A7": { "A4": 300, "A5": 800, "A6": 500, "A8": 400 },
        "A8": { "A6": 1200, "A7": 400, "A9": 700 },
        "A9": { "A2": 1000, "A8": 700 }
    }

    constructor(connections?: Record<string, Record<string, number>>) {
        this.connections = connections || this.connections;
    }

    getConnections(): Promise<AirportConnections> {
        return Promise.resolve(this.connections);
    }
}

class MockExtendedConnectionStrategy implements AirportConnectionStrategy {
    private readonly connections: Record<string, Record<string, number>> = {
        "A1": { "A2": 500, "A3": 100 },
        "A2": { "A1": 500, "A6": 800, "A9": 1000 },
        "A3": { "A1": 100, "A4": 200, "A5": 600 },
        "A4": { "A3": 200, "A7": 300 },
        "A5": { "A3": 600, "A7": 800 },
        "A6": { "A2": 800, "A7": 500, "A8": 1200 },
        "A7": { "A4": 300, "A5": 800, "A6": 500, "A8": 400 },
        "A8": { "A6": 1200, "A7": 400, "A9": 700 },
        "A9": { "A2": 1000, "A8": 700, "A9+": 0 },
        "A9+": { "A9": 0, "A10+": 50 },
        "A10+": { "A9+": 50, "A10": 0 },
        "A10": { "A10+": 0 }
    }

    constructor(connections?: Record<string, Record<string, number>>) {
        this.connections = connections || this.connections;
    }

    getConnections(): Promise<AirportConnections> {
        return Promise.resolve(this.connections);
    }
}

class MockAirportProvider implements AirportProvider {
    getAirports(): Promise<Map<string, Airport>> {
        return Promise.resolve(
            new Map(
                [airport1, airport2, airport3, airport4, airport5, airport6, airport7, airport8, airport9, airport10]
                    .map(airport => [airport.iata, airport])
            )
        );
    }
}

describe("flights", () => {
    let airportProvider: AirportProvider;
    let airportConnection: AirportConnectionStrategy;
    let shortestRouteStrategy: RouteStrategy;

    beforeEach(() => {
        airportProvider = new MockAirportProvider;
        airportConnection = new MockAirportConnectionStrategy;
        shortestRouteStrategy = new ShortestRouteStrategy(airportProvider, airportConnection);
    })

    test("returns the shortest route", async () => {
        const source = airport1;
        const destination = airport8;

        const route = await shortestRouteStrategy.buildRoute(source.iata, destination.iata);

        expect(route.totalDistance).toBe(1000);
        expect(route.path.map(airport => airport)).toEqual(["A1", "A3", "A4", "A7", "A8"]);
    });

    test("returns no routes for the specified hop count", async () => {
        const source = airport1;
        const destination = airport8;

        const route = await shortestRouteStrategy.buildRoute(
            source.iata,
            destination.iata,
            {
                hops: 3
            }
        );

        expect(route.path).toBeEmpty();
        expect(route.totalDistance).toBe(0);
    });

    test("returns the shortest route for max 3 hops", async () => {
        const source = airport1;
        const destination = airport4;

        const connections: Record<string, Record<string, number>> = {
            "A1": { "A2": 10, "A5": 50 },
            "A2": { "A1": 10, "A3": 10 },
            "A3": { "A2": 10, "A4": 10 },
            "A4": { "A3": 10, "A5": 50 },
            "A5": { "A4": 50 }
        };

        // the shortest path is A1 -> A2 -> A3 -> A4 = 40 but since it has 4 hops, the second route is found A1 -> A5 -> A4 = 100
        const connectionStrategy = new MockAirportConnectionStrategy(connections);
        const routeStrategy = new ShortestRouteStrategy(airportProvider, connectionStrategy);

        const route = await routeStrategy.buildRoute(
            source.iata,
            destination.iata,
            {
                hops: 3
            }
        );

        expect(route.totalDistance).toBe(100);
        expect(route.path.map(airport => airport)).toEqual(["A1", "A5", "A4"]);
    });

    test("route not found", async () => {
        const source = airport1;
        const destination = airport10;


        const route = await shortestRouteStrategy.buildRoute(source.iata, destination.iata);

        expect(route.path).toHaveLength(0);
    });
});

describe("Fligths & Ground", () => {
    let airportProvider: AirportProvider;
    let airportConnection: AirportConnectionStrategy;
    let extendedAirportConnection: AirportConnectionStrategy;
    let shortestRouteStrategy: RouteStrategy;

    beforeEach(() => {
        airportProvider = new MockAirportProvider;
        airportConnection = new MockAirportConnectionStrategy;
        extendedAirportConnection = new MockExtendedConnectionStrategy;
        shortestRouteStrategy = new ShortestRouteStrategy(airportProvider, extendedAirportConnection);
    });


    test("returns the shortest route with one ground connection", async () => {
        const source = airport1;
        const destination = airport10;
        const route = await shortestRouteStrategy.buildRoute(source.iata, destination.iata);

        expect(route.totalDistance).toEqual(1550);
        expect(route.path).toEqual(["A1", "A2", "A9", "A9+", "A10+", "A10"]);
    });

    test("returns the shortest route with multiple ground connection", async () => {
        class MockExtendedRouteLengthStrategy implements RouteLengthStrategy {
            hasValidLength(path: string[], hops?: number): boolean {
                if (!hops) return true;
                return path.reduce(
                    (sum, chunck, index) => {
                        if (chunck.includes("+") || path[index + 1]?.includes("+")) {
                            return sum;
                        }
                        return sum + 1;
                    },
                    0
                ) < hops
            }
        }

        const source = airport1;
        const destination = airport7;

        const connections: Record<string, Record<string, number>> = {
            "A1": { "A2": 500 },
            "A2": { "A1": 500, "A2+": 0 },
            "A2+": { "A2": 0, "A3+": 70 },
            "A3": { "A3+": 0 },
            "A3+": { "A3": 0, "A2+": 70, "A4+": 55 },
            "A4": { "A4+": 0, "A5": 1000 },
            "A4+": { "A4": 0 },
            "A5": { "A6": 600 },
            "A6": { "A5": 600, "A6+": 0 },
            "A6+": { "A6": 0, "A7+": 20 },
            "A7": { "A7+": 0 },
            "A7+": { "A7": 0 }
        }

        const connectionStrategy = new MockExtendedConnectionStrategy(connections);
        const routeLengthStrategy = new MockExtendedRouteLengthStrategy;
        const routeStrategy = new ShortestRouteStrategy(airportProvider, connectionStrategy, routeLengthStrategy);
        const route = await routeStrategy.buildRoute(
            source.iata,
            destination.iata,
            {
                hops: 5
            });

        expect(route.totalDistance).toEqual(2245);
        expect(route.path).toEqual(["A1", "A2", "A2+", "A3+", "A4+", "A4", "A5", "A6", "A6+", "A7+", "A7"]);
    });
});
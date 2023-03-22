import { AirportProvider } from "../data/airport-provider";
import { Airport } from "../data/entities";
import { AirportConnections, AirportConnectionStrategy, ExtendedConnectionStrategy } from "./aiport-connection-strategy";

class MockAirport extends Airport {
    getDistanceTo(destination: Airport): number {
        return Math.abs(destination.latitude - this.latitude);
    }
}

const airport1 = new MockAirport("1", "A1", "A1", "Airport1", 100, 0);
const airport2 = new MockAirport("2", "A2", "A2", "Airport2", 300, 0);
const airport3 = new MockAirport("3", "A3", "A3", "Airport3", 400, 0);
const airport4 = new MockAirport("4", "A4", "A4", "Airport4", 450, 0);
const airport5 = new MockAirport("5", "A5", "A5", "Airport5", 460, 0);

class MockAirportProvider implements AirportProvider {
    private readonly airports = new Map<string, Airport>;

    constructor() {
        this.airports.set(airport1.iata, airport1);
        this.airports.set(airport1.icao, airport1);

        this.airports.set(airport2.iata, airport2);
        this.airports.set(airport2.icao, airport2);

        this.airports.set(airport3.iata, airport3);
        this.airports.set(airport3.icao, airport3);

        this.airports.set(airport4.iata, airport4);
        this.airports.set(airport4.icao, airport4);

        this.airports.set(airport5.iata, airport5);
        this.airports.set(airport5.icao, airport5);
    }

    getAirports(): Promise<Map<string, Airport>> {
        return Promise.resolve(this.airports);
    }
}

class MockBasicAirportConnectionStrategy implements AirportConnectionStrategy {
    private readonly connections: Record<string, Record<string, number>> = {
        "A2": { "A3": 100 },
        "A3": { "A2": 100 }
    }

    getConnections(): Promise<AirportConnections> {
        return Promise.resolve(this.connections);
    }
}

describe("Connections", () => {
    let airportProvider: AirportProvider;
    let airportConnection: MockBasicAirportConnectionStrategy;
    let extendedConnection: ExtendedConnectionStrategy;

    beforeEach(() => {
        airportProvider = new MockAirportProvider();
        airportConnection = new MockBasicAirportConnectionStrategy;
        extendedConnection = new ExtendedConnectionStrategy(100, airportConnection, airportProvider);
    })

    test("returns connections", async () => {
        const connections = await extendedConnection.getConnections();

        const expected = {
            "A2": { "A3": 100, "A2+": 0 },
            "A3": { "A2": 100, "A3+": 0 },
            "A2+": { "A2": 0, "A3+": 100 },
            "A4": { "A4+": 0 },
            "A3+": { "A3": 0, "A2+": 100, "A4+": 50, "A5+": 60 },
            "A4+": { "A4": 0, "A3+": 50, "A5+": 10 },
            "A5+": { "A5": 0, "A3+": 60, "A4+": 10 },
            "A5": { "A5+": 0 }
        };
        expect(connections).toEqual(expected);
    });
});
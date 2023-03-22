import { Airport, Route } from "../data/entities";

import { AirportProvider } from "../data/airport-provider";
import { AppContext } from "../data/app-context";

export type AirportConnection = Record<string, number>;
export type AirportConnections = Record<string, AirportConnection>;

export interface AirportConnectionStrategy {
    getConnections(): Promise<AirportConnections>;
}

export class RegularFlightsStrategy implements AirportConnectionStrategy {
    private airports!: Map<string, Airport>;
    private routes!: Map<string, Route[]>;

    constructor(
        private readonly appContext: AppContext,
        private readonly airportProvider: AirportProvider
    ) { }

    async getConnections(): Promise<AirportConnections> {
        await this.loadAirports();
        await this.loadRoutes();

        return Array.from(this.airports.values()).reduce(
            (airportConnections, airport) => {
                const routes = this.routes.get(airport.iata);
                if (!routes) {
                    airportConnections[airport.iata] = {};
                    return airportConnections;
                }

                const connections = routes
                    .reduce(
                        (routes, route) => {
                            const destination = this.airports.get(route.destinationAirportCode);
                            if (!destination) {

                                return routes;
                            }

                            routes[route.destinationAirportCode] = airport.getDistanceTo(destination);
                            return routes;
                        },
                        {} as AirportConnection
                    );

                airportConnections[airport.iata] = connections;
                return airportConnections;
            },
            {} as AirportConnections
        );
    }

    private async loadAirports(): Promise<void> {
        if (this.airports) return;
        this.airports = await this.airportProvider.getAirports();
    }

    private async loadRoutes(): Promise<void> {
        if (this.routes) return;
        this.routes = (await this.appContext.getRoutes()).groupBy(route => route.sourceAirportCode);
    }
}

export class ExtendedConnectionStrategy implements AirportConnectionStrategy {
    private airports!: Map<string, Airport>;

    constructor(
        private readonly maxDistance: number,
        private readonly airportConnections: AirportConnectionStrategy,
        private readonly airportProvider: AirportProvider
    ) { }

    async getConnections(): Promise<AirportConnections> {
        await this.loadAirports();

        const airportConnections = await this.airportConnections.getConnections();
        const airports = Array.from(this.airports.values());

        for (let i = 0; i < airports.length; ++i) {
            for (let j = i + 1; j < airports.length; ++j) {
                const airport1 = airports[i];
                const airport2 = airports[j];
                const distance = airport1.getDistanceTo(airport2);
                const airport1Key = airport1.iata;
                const airport2Key = airport2.iata;

                if (airport1Key === "\\N" || airport2Key === "\\N") continue;

                if (distance <= this.maxDistance) {
                    const extendedAirport1Key = this.generateExtendedAirportCode(airport1Key);
                    const extendedAirport2Key = this.generateExtendedAirportCode(airport2Key);

                    airportConnections[airport1Key] = airportConnections[airport1Key] || {};
                    airportConnections[airport1Key][extendedAirport1Key] = 0;

                    airportConnections[extendedAirport1Key] = airportConnections[extendedAirport1Key] || {};
                    airportConnections[extendedAirport1Key][airport1Key] = 0;
                    airportConnections[extendedAirport1Key][extendedAirport2Key] = distance;

                    airportConnections[extendedAirport2Key] = airportConnections[extendedAirport2Key] || {};
                    airportConnections[extendedAirport2Key][airport2Key] = 0;
                    airportConnections[extendedAirport2Key][extendedAirport1Key] = distance;

                    airportConnections[airport2Key] = airportConnections[airport2Key] || {};
                    airportConnections[airport2Key][extendedAirport2Key] = 0;
                }
            }
        }

        return airportConnections;
    }

    private generateExtendedAirportCode(name: string): string {
        return `${name}+`;
    }

    private async loadAirports(): Promise<void> {
        if (this.airports) return;
        this.airports = await this.airportProvider.getAirports();
    }
}
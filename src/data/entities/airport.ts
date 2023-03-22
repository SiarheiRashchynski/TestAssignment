import { Route, RouteStrategy } from "../../strategies";

import haversine from "haversine";

export class Airport {

    constructor(
        readonly airportId: string,
        readonly iata: string,
        readonly icao: string,
        readonly name: string,
        readonly latitude: number,
        readonly longitude: number
    ) { }

    getDistanceTo(destination: Airport): number {
        const from = { latitude: this.latitude, longitude: this.longitude };
        const to = { latitude: destination.latitude, longitude: destination.longitude };
        return haversine(from, to, { unit: "km" });
    }

    async buildRouteTo(destination: Airport, routeStrategy: RouteStrategy, options?: { hops?: number }): Promise<Route> {
        return await routeStrategy.buildRoute(this.iata, destination.iata, options);
    }
}
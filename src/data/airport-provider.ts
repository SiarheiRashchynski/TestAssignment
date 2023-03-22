import { Airport } from "./entities";
import { AppContext } from "./app-context";

export interface AirportProvider {
    getAirports(): Promise<Map<string, Airport>>;
}

export class CachedAirportProvider implements AirportProvider {
    private airports?: Map<string, Airport>;

    constructor(private readonly appContext: AppContext) { }

    async getAirports(): Promise<Map<string, Airport>> {
        if (!this.airports) {
            this.airports = (await this.appContext.getAirports())
                .reduce(
                    (airportMap, airport) => {
                        airportMap.set(airport.airportId, airport);
                        airportMap.set(airport.iata, airport);
                        airportMap.set(airport.icao, airport);
                        return airportMap;
                    },
                    new Map
                );
        }

        return this.airports;
    }
}
import * as fs from "fs";

import { Airport, Route } from "./entities";

import csv from "csv-parser";

export interface Context {
    getAirports(): Promise<Airport[]>;
}

export class AppContext implements Context {
    async getAirports(): Promise<Airport[]> {
        const airports: Airport[] = [];

        const stream = fs.createReadStream("airports.csv").pipe(csv());

        for await (const row of stream) {
            const airport = new Airport(row["Airport ID"], row["IATA"], row["ICAO"], row["Name"], parseFloat(row["Latitude"]), parseFloat(row["Longitude"]));
            airports.push(airport);
        }

        return airports;
    }

    async getRoutes(): Promise<Route[]> {
        const routes: Route[] = [];

        const stream = fs.createReadStream("routes.csv").pipe(csv());

        for await (const row of stream) {
            const route = {
                sourceAirportCode: row["Source airport"],
                sourceAirportId: row["Source airport ID"],
                destinationAirportId: row["Destination airport ID"],
                destinationAirportCode: row["Destination airport"],
                stops: row["Stops"]
            } as Route;
            routes.push(route);
        }

        return routes;
    }
}
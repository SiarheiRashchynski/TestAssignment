import "./utils/extensions";

import { ExtendedConnectionStrategy, RegularFlightsStrategy, ShortestRouteStrategy } from "./strategies";
import { Request, Response } from "express";
import { param, validationResult } from "express-validator";

import { AppContext } from "./data/app-context";
import { CachedAirportProvider } from "./data/airport-provider";
import express from "express";

const app = express();
const port = 80;

app.get(
    "/regular-flights/shortest-route/:source/:destination",
    param("source").notEmpty(),
    param("destination").notEmpty(),
    async (request: Request, response: Response) => {
        const errors = validationResult(request);
        if (!errors.isEmpty()) {
            return response.status(400).json({ errors: errors.array() });
        }

        // should have added an IoC container here
        const appContext = new AppContext;
        const airportProvider = new CachedAirportProvider(appContext);
        const airportConnectionStrategy = new RegularFlightsStrategy(appContext, airportProvider);
        const extendedConnectionStrategy = new ExtendedConnectionStrategy(100, airportConnectionStrategy, airportProvider);

        const groundSeparator = " => ";
        const airSeparator = " -> ";
        let routeStrategy = new ShortestRouteStrategy(airportProvider, airportConnectionStrategy);
        let routeToString = (path: string[]) => path.join(airSeparator);

        if (request.query["with-ground-connections"] === "true") {
            routeStrategy = new ShortestRouteStrategy(airportProvider, extendedConnectionStrategy);

            routeToString = (path: string[]) => {
                const result: string[] = [];
                for (const chunk of path) {
                    if (chunk.includes("+")) {
                        if (result.at(-1)?.includes(airSeparator)) {
                            result.splice(-1);
                            result.push(groundSeparator);
                        } else {
                            result.push(chunk.replace("+", ""));
                            result.push(groundSeparator);
                        }
                    } else {
                        const previousChunk = result.at(-1);
                        result.push(chunk);
                        if (previousChunk?.includes(groundSeparator)) {
                            result.splice(-2);
                        }

                        if (path.lastIndexOf(chunk) < path.length - 1) {
                            result.push(airSeparator);
                        }
                    }
                }

                return result.join("");
            };
        }

        const airports = await airportProvider.getAirports();

        if (!airports.size) {
            response.sendStatus(500);
            return;
        }

        const sourceAirport = airports.get(request.params.source);
        const destinationAirport = airports.get(request.params.destination);

        if (!sourceAirport || !destinationAirport) {
            response.sendStatus(404).send("Aiport is not found");
            return;
        }

        const result = await sourceAirport.buildRouteTo(destinationAirport, routeStrategy, { hops: 5 }); // 5 hops equal to 4 legs or 3 layovers

        const aiports = await airportProvider.getAirports();

        response.send({
            path: result.path.map(chunk => aiports.get(chunk)).filter(i => !!i),
            totalDistance: result.totalDistance,
            asString: routeToString(result.path)
        });
    }
);

app.listen(port, () => console.log(`server started at http://localhost:${port}`));
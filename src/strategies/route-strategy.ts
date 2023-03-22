import { AirportConnectionStrategy, AirportConnections } from "./aiport-connection-strategy";

import { Airport } from "../data/entities";
import { AirportProvider } from "../data/airport-provider";
import PriorityQueue from "ts-priority-queue";

export interface Route {
    path: string[];
    totalDistance: number;
}

export interface RouteStrategy {
    buildRoute<T>(source: string, destination: string, options?: { hops?: number }): Promise<Route>;
}

export interface RouteLengthStrategy {
    hasValidLength(path: string[], hops?: number): boolean
}

export class ExtendedRouteLengthStrategy implements RouteLengthStrategy {
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

export class ShortestRouteStrategy implements RouteStrategy {
    private airports!: Map<string, Airport>;
    private airportConnections!: AirportConnections;

    constructor(
        private readonly airportProvider: AirportProvider,
        private readonly airportConnectionStrategy: AirportConnectionStrategy,
        routeLengthStrategy?: RouteLengthStrategy,
    ) {
        if (routeLengthStrategy) {
            this.hasValidLength = routeLengthStrategy.hasValidLength;
        }
    }

    async buildRoute(source: string, destination: string, options?: { hops?: number }): Promise<Route> {
        await this.loadAirports();
        await this.loadAirportConnections();

        const airportVisited: Set<string> = new Set;
        const pathVisited: Set<string> = new Set;
        const queue = new PriorityQueue<{ airport: string; path: string[]; totalDistance: number }>({
            comparator: (a, b) => a.totalDistance - b.totalDistance,
        });

        queue.queue({ airport: source, path: [], totalDistance: 0 });
        while (queue.length > 0) {
            const { airport, path, totalDistance } = queue.dequeue();

            const newPath = [...path, airport];
            if ((airportVisited.has(airport) && pathVisited.has(newPath.join())) 
                || !this.hasValidLength(path, options?.hops)) {
                continue;
            }

            airportVisited.add(airport);
            pathVisited.add(path.join());

            if (airport === destination) {
                return { path: newPath, totalDistance };
            }

            for (const neighbor in this.airportConnections[airport]) {
                if (airportVisited.has(neighbor)) {
                    continue;
                }
                const distanceToNeighbor = this.airportConnections[airport][neighbor];
                const newTotalDistance = totalDistance + distanceToNeighbor;
                queue.queue({ airport: neighbor, path: newPath, totalDistance: newTotalDistance });
            }
        }

        return { path: [], totalDistance: 0 };
    }

    private async loadAirports(): Promise<void> {
        if (this.airports) return;
        this.airports = await this.airportProvider.getAirports();
    }

    private async loadAirportConnections(): Promise<void> {
        if (this.airportConnections) return;
        this.airportConnections = await this.airportConnectionStrategy.getConnections();
    }

    private readonly hasValidLength = (path: string[], hops?: number): boolean => {
        if (!hops) return true;
        return path.length < hops;
    }
}
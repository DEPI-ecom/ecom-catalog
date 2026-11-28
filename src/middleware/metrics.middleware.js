import client from "prom-client";

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const requestsTotal = new client.Counter({
    name: "http_requests_total",
    help: "Total HTTP requests",
    labelNames: ["method", "route", "status"],
    registers: [register]
});

export function metricsMiddleware(req, res, next) {
    res.on("finish", () => {
        // Use the route pattern (/products/:productId), never the raw URL,
        // so labels stay low-cardinality.
        const route = req.route ? `${req.baseUrl}${req.route.path}` : "unmatched";

        requestsTotal.inc({ method: req.method, route, status: res.statusCode });
    });

    next();
}

export async function metricsHandler(req, res) {
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
}
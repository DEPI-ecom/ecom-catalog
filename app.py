import os

import psycopg
from flask import Flask, jsonify
from prometheus_client import CollectorRegistry
from prometheus_flask_exporter import PrometheusMetrics

from db import get_conn, init_db

COLUMNS = "id, name, price, description"


def to_product(row):
    return {"id": row[0], "name": row[1], "price": float(row[2]), "description": row[3]}


def create_app(init_database=True):
    app = Flask(__name__)
    # group_by: without it every product id becomes its own label value
    # a registry per app, so tests can create the app more than once
    metrics = PrometheusMetrics(
        app,
        group_by="url_rule",
        excluded_paths=["^/health$", "^/ready$", "^/metrics$"],
        registry=CollectorRegistry(),
    )
    metrics.info("app_info", "app version", version=os.getenv("APP_VERSION", "dev"))
    if init_database:
        init_db()

    # /health must not touch the db, otherwise Kubernetes restarts every pod
    # whenever the db has a hiccup. /ready is the one that checks dependencies.
    @app.get("/health")
    def health():
        return jsonify(status="ok")

    @app.get("/ready")
    def ready():
        try:
            with get_conn() as conn:
                conn.execute("SELECT 1")
        except psycopg.Error:
            return jsonify(status="database unavailable"), 503
        return jsonify(status="ready")

    @app.get("/api/catalog/products")
    def list_products():
        with get_conn() as conn:
            rows = conn.execute(f"SELECT {COLUMNS} FROM products ORDER BY id").fetchall()
        return jsonify([to_product(row) for row in rows])

    @app.get("/api/catalog/products/<int:product_id>")
    def get_product(product_id):
        with get_conn() as conn:
            row = conn.execute(
                f"SELECT {COLUMNS} FROM products WHERE id = %s", (product_id,)
            ).fetchone()
        if row is None:
            return jsonify(error="product not found"), 404
        return jsonify(to_product(row))

    @app.get("/api/catalog/version")
    def version():
        return jsonify(service="catalog", version=os.getenv("APP_VERSION", "dev"))

    return app


if __name__ == "__main__":
    create_app().run(host="0.0.0.0", port=int(os.getenv("PORT", "5000")))
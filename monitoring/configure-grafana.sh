#!/bin/bash

echo "🔧 Configuring Grafana with Prometheus data source and dashboard..."

# Wait for Grafana to be ready
echo "Waiting for Grafana to be ready..."
until curl -s http://localhost:3000/api/health > /dev/null; do
    echo "Waiting for Grafana..."
    sleep 2
done

echo "✅ Grafana is ready"

# Add Prometheus data source
echo "Adding Prometheus data source..."
curl -X POST \
  http://admin:admin123@localhost:3000/api/datasources \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Prometheus",
    "type": "prometheus",
    "url": "http://prometheus:9090",
    "access": "proxy",
    "isDefault": true
  }'

echo ""
echo "✅ Prometheus data source added"

# Import dashboard
echo "Importing dashboard..."
curl -X POST \
  http://admin:admin123@localhost:3000/api/dashboards/db \
  -H "Content-Type: application/json" \
  -d @grafana/dashboards/grafana-dashboard.json

echo ""
echo "✅ Dashboard imported"

echo ""
echo "🎉 Grafana configuration complete!"
echo "📊 Dashboard URL: http://localhost:3000"
echo "👤 Login: admin / admin123"

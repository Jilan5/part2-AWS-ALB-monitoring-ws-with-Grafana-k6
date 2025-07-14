# Local Monitoring Setup for EC2 Deployment

This folder contains the configuration needed to run a local monitoring stack that tracks metrics from your EC2-deployed WebSocket application.

## Setup Instructions

1. **Update the Prometheus configuration**

   Edit `prometheus.yml` and replace the placeholders with your actual EC2 instance public IPs or DNS names:
   
   ```yaml
   - targets: ['APP_SERVER_1_PUBLIC_IP:80']  # Replace with actual EC2 public IP
   - targets: ['APP_SERVER_2_PUBLIC_IP:80']  # Replace with actual EC2 public IP
   - targets: ['REDIS_EC2_PUBLIC_IP:9121']   # Replace with actual EC2 public IP
   ```

2. **Ensure EC2 Security Groups**

   Make sure your EC2 instances' security groups allow incoming traffic from your local IP address to:
   - Port 80 (HTTP/WebSocket app)
   - Port 9121 (Redis exporter)

3. **Start the monitoring stack**

   ```bash
   docker compose up -d
   ```

4. **Access the dashboards**

   - Prometheus: http://localhost:9090
   - Grafana: http://localhost:3000 (admin/admin123)

## Importing Your Dashboard

If you already have a Grafana dashboard JSON file:

1. Copy your dashboard JSON file to the `grafana/dashboards` directory
2. Restart the Grafana container or use the Grafana UI to import it

## Troubleshooting

If Prometheus can't connect to your EC2 instances:

1. Check the EC2 security groups
2. Verify that your app is exposing metrics on the `/metrics` endpoint
3. Test connectivity with: `curl http://YOUR_EC2_IP/metrics`
4. Check Prometheus logs: `docker compose logs prometheus`

## Additional Notes

- The Prometheus data is persisted in a local volume
- Grafana settings and dashboards are also persisted in a volume
- To update scrape targets without restart: `curl -X POST http://localhost:9090/-/reload`

# AWS Chat Application Monitoring and Load Testing using Grafan k6

## Lab Overview

In this lab, we will deploy a real-time chat application to AWS using multiple EC2 instances behind an Application Load Balancer (ALB), then set up local monitoring and load testing to observe application behavior under normal conditions and during simulated failures.

## Objectives

1. **Deploy** a chat application to AWS EC2 instances with Redis backend
2. **Configure** local Prometheus and Grafana monitoring to track application metrics
3. **Set up** automated dashboard provisioning for real-time visualization
4. **Perform** load testing using k6 to simulate WebSocket connections and message traffic
5. **Observe** application behavior when both servers are healthy vs. when one server fails
6. **Analyze** metrics and performance during chaos testing scenarios

## What We're Monitoring

- **Server Health**: Track if both chat servers are responding
- **WebSocket Connections**: Monitor active connections across instances
- **Message Traffic**: Observe message sending/receiving rates
- **HTTP Performance**: Track request rates and response times
- **Load Balancer**: Monitor ALB health and traffic distribution

---
<img width="2524" height="819" alt="Untitled-2025-07-20-1255" src="https://github.com/user-attachments/assets/65c6d772-a591-4b46-8651-cc6708db4d37" />



## Part 1: Deploy Chat Application and Set Up Monitoring Configuration

### 1.1 Clone and Deploy the Application
### Repo Link - https://github.com/Jilan5/scaling-websocket-with-AWS-ALB.git
Follow the deployment tutorial in the main repository to deploy the chat application using Pulumi. This will create:
- 2 EC2 instances running the chat app
- 1 EC2 instance running Redis  
- Application Load Balancer distributing traffic
- Security groups allowing HTTP (80) and WebSocket traffic

```bash
# Follow the deployment guide in the main repository
# After deployment, note down:
# - Server 1 public IP
# - Server 2 public IP  
# - Redis server public IP
# - ALB DNS endpoint
```

### 1.2 Verify Deployment

```bash
# Test your ALB endpoint
curl http://your-alb-endpoint.elb.amazonaws.com/health

# Verify both servers are accessible
curl http://server1-ip:80/metrics
curl http://server2-ip:80/metrics
```

### 1.3 Clone Monitoring Configuration

```bash
# Clone the monitoring configuration
git clone <Current REPO>
cd /monitoring
```

### 1.4 Navigate to Monitoring Directory

```bash
# Change to the monitoring directory
cd tmp/monitoring

# List the files to verify setup
ls -la
```

### 1.5 Configure Prometheus Targets

Update the `prometheus.yml` file with your actual EC2 public IPs and ALB endpoint:
- Replace `YOUR_SERVER_1_IP` with Server 1 public IP
- Replace `YOUR_SERVER_2_IP` with Server 2 public IP  
- Replace `YOUR_ALB_ENDPOINT` with ALB DNS name
- Replace `YOUR_REDIS_IP` with Redis server public IP

```bash
# Edit prometheus.yml file
nano prometheus.yml
```

### 1.6 Start Monitoring Stack

```bash
# Launch Prometheus and Grafana
docker-compose up -d

# Verify containers are running
docker ps

# Check Prometheus is scraping targets
curl http://localhost:9090/targets
```

---

## Part 2: Understanding PromQL and Metrics

### 2.1 What is PromQL?

**PromQL (Prometheus Query Language)** is the query language used by Prometheus to select and aggregate time series data. It allows you to:

- **Query metrics:** Ask Prometheus for specific metrics data
- **Filter data:** Use labels to filter results (job, instance, status)
- **Aggregate data:** Sum, average, or find min/max values over time
- **Create expressions:** Perform mathematical operations on metrics
- **Analyze trends:** Calculate rates, increases, and changes over time

### 2.2 Metrics Documentation

Our chat application exposes several custom metrics that we can query with PromQL:

#### Custom Application Metrics

| Metric Name | Type | Description | Labels | Example PromQL |
|-------------|------|-------------|--------|----------------|
| `http_requests_total` | Counter | Total HTTP requests | method, endpoint, status_code | `sum(rate(http_requests_total[5m]))` |
| `app_uptime_seconds` | Gauge | Application uptime | none | `app_uptime_seconds` |
| `websocket_connections_total` | Gauge | Active WebSocket connections | instance_id | `sum(websocket_connections_total)` |
| `websocket_messages_total` | Counter | WebSocket messages processed | direction, instance_id | `rate(websocket_messages_total[1m])` |
| `background_task_execution_seconds` | Histogram | Background task execution time | none | `histogram_quantile(0.95, background_task_execution_seconds_bucket)` |

#### System Metrics (Auto-exported)

| Metric Name | Type | Description | Example PromQL |
|-------------|------|-------------|----------------|
| `up` | Gauge | Target availability (1=up, 0=down) | `up{job="app-server-1"}` |
| `python_gc_objects_collected_total` | Counter | Python garbage collection stats | `rate(python_gc_objects_collected_total[5m])` |
| `process_resident_memory_bytes` | Gauge | Process memory usage | `process_resident_memory_bytes / 1024 / 1024` |
| `process_cpu_seconds_total` | Counter | CPU time consumed | `rate(process_cpu_seconds_total[5m]) * 100` |

### 2.3 Viewing Metrics in Prometheus (Port 9090)

Access Prometheus web interface at `http://localhost:9090` to explore and visualize metrics:

#### Step 1: Basic Metric Queries
```bash
# Open Prometheus web UI
http://localhost:9090

# Try these basic queries in the expression browser:
```

**Simple Queries:**
- `http_requests_total` - Show all HTTP request counters
- `up` - Show which targets are up/down
- `app_uptime_seconds` - Show application uptime

**Screenshot Space: Prometheus Query Interface**
<img width="1919" height="805" alt="image" src="https://github.com/user-attachments/assets/ae65e9d9-8f24-47fc-b430-723e50f2d5c8" />


#### Step 2: Advanced PromQL Queries
```promql
# HTTP request rate per second (last 5 minutes)
sum(rate(http_requests_total[5m]))

# Error rate percentage
sum(rate(http_requests_total{status_code=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) * 100

# WebSocket connections by instance
sum by (instance_id) (websocket_connections_total)

# Memory usage in MB
process_resident_memory_bytes / 1024 / 1024

# CPU usage percentage
rate(process_cpu_seconds_total[5m]) * 100
```

**Screenshot Space: Prometheus Advanced Queries**
<img width="1919" height="805" alt="image" src="https://github.com/user-attachments/assets/adca7679-50f0-4068-8ddf-d00ab2c11396" />


### 2.4 Building Custom Grafana Dashboard from PromQL

Instead of importing a pre-built dashboard, you can create your own using the PromQL queries:

#### Step 1: Create New Dashboard

**Access Grafana:**
- Open your browser and go to: http://localhost:3000  or make  a Load Balancer if you are trying from Poridhi Virtual Machine
- Login credentials: Username: admin, Password: admin123

**Add Prometheus Data Source:**
- Click "Connections" → "Data sources" (or gear icon → "Data sources")
- Click "Add data source"
- Select "Prometheus"
- Configure the URL:
  - Get your eth0 IP address: `ip addr show eth0`
  - Use: http://YOUR_ETH0_IP:9090 (e.g., http://192.168.1.100:9090)
  - **Important:** Do NOT use localhost:9090 (won't work from Grafana container)
- Click "Save & test" to verify connection
<img width="1919" height="805" alt="image" src="https://github.com/user-attachments/assets/94336050-a7e0-4912-82e6-6a50203c237d" />

**Create New Dashboard:**
- Click "+" → "Dashboard"
- Click "Add new panel"  
- Select the Prometheus data source you just configured


#### Step 2: Add Panels with Custom PromQL

**Panel 1: Server Health Status**
```promql
# Query: up{job=~"app-server-.*"}
# Visualization: Stat
# Value mappings: 0=DOWN, 1=UP
# Thresholds: Red=0, Green=1
```
<img width="1919" height="805" alt="image" src="https://github.com/user-attachments/assets/2d0441ba-7d92-4af4-8ce2-5a624e51245f" />


**Panel 2: HTTP Request Rate**
```promql
# Query: sum(rate(http_requests_total[5m]))
# Visualization: Time series
```
<img width="1919" height="805" alt="image" src="https://github.com/user-attachments/assets/58cfe2fd-4fb3-43fc-9148-3ba0cbc590a3" />

**Panel 3: WebSocket Connections**
```promql
# Query: sum(websocket_connections_total)
# Visualization: Gauge

```
<img width="1919" height="805" alt="image" src="https://github.com/user-attachments/assets/23273d71-155b-4d0f-96f2-9138c5facb30" />



#### Step 3: Configure Panel Options
```bash
# For each panel:
# 1. Set title and description
# 2. Configure visualization type
# 3. Set units and decimal places
# 4. Add thresholds for color coding
# 5. Set refresh interval
```


#### Step 4: Save Dashboard
```bash
# 1. Click "Save dashboard" (top right)
# 2. Enter dashboard name: "Custom Chat App Monitoring"
# 3. Add description and tags
# 4. Click "Save"
```

**Screenshot Space: Custom Dashboard Result**
<img width="1919" height="805" alt="image" src="https://github.com/user-attachments/assets/061674a8-9898-4cb3-8d2b-917976fe78f0" />


### 2.5 PromQL Best Practices

**Rate Functions:**
- Use `rate()` for counters to get per-second rates
- Use `increase()` for counters to get total increase over time
- Use `irate()` for instant rate (last two data points)

**Aggregation:**
- `sum()` - Add values together
- `avg()` - Calculate average
- `max()`/`min()` - Find maximum/minimum
- `count()` - Count number of series

**Time Ranges:**
- `[5m]` - Last 5 minutes
- `[1h]` - Last 1 hour
- `[1d]` - Last 1 day

**Label Filtering:**
- `{job="app-server-1"}` - Exact match
- `{status_code=~"5.."}` - Regex match (5xx errors)
- `{instance!="localhost"}` - Not equal

---

## Part 3: Grafana Dashboard Configuration- ( Pre Build for this project only )

### 3.1 Configure Grafana Dashboard

```bash
# Wait for Grafana to start, then run the configuration script
chmod +x configure-grafana.sh
./configure-grafana.sh

# Access Grafana
# URL: http://localhost:3000 or make  a Load Balancer if you are trying from Poridhi Virtual Machine
# Username: admin
# Password: admin123
```

### 3.2 Access Monitoring Interfaces

- **Prometheus:** http://localhost:9090 or make  a Load Balancer if you are trying from Poridhi Virtual Machine
  - Check targets: Status → Targets
  - Query metrics: Graph tab
- **Grafana:** http://localhost:3000 or make  a Load Balancer if you are trying from Poridhi Virtual Machine
  - Login: admin/admin (change on first login)
  - Import dashboard or use auto-provisioned one

### 3.3 Dashboard Import Alternative

If you prefer to use the pre-built dashboard instead of creating a custom one, you can use the automated dashboard import method described above in section 3.1.

### **Case 1: Grafana Dashboard - Both Servers Running**
<img width="1907" height="926" alt="Screenshot from 2025-07-14 18-52-42" src="https://github.com/user-attachments/assets/a33bac40-c9bf-486c-9098-cf0a9c6e3338" />
<img width="1866" height="971" alt="Screenshot from 2025-07-14 18-54-04" src="https://github.com/user-attachments/assets/493e6a79-fb33-45bc-88f2-13bc748496c9" />




---

## Part 4: Chaos Testing - Simulate Server Failure

### 4.1 Stop One Server Instance

```bash
# SSH to one of your EC2 instances
ssh -i your-key.pem ubuntu@server-2-ip

# Stop the chat application container
sudo docker stop chat-app-container-name

# Or stop the entire instance from AWS Console
```

### 4.2 Observe Metrics During Failure

```bash
# Check Prometheus targets status
curl http://localhost:9090/api/v1/targets | grep health

# Monitor Grafana dashboard for changes
# Watch for:
# - Server health status changes
# - Traffic redistribution to remaining server
# - Connection handling behavior
```

### **Case 2: Grafana Dashboard - One Server Down**
<img width="1919" height="933" alt="Screenshot from 2025-07-14 19-15-45" src="https://github.com/user-attachments/assets/ace1fc9e-f821-45d0-b227-d802ab395694" />
<img width="1919" height="933" alt="Screenshot from 2025-07-14 19-15-58" src="https://github.com/user-attachments/assets/f843226a-1fa6-48b7-bf29-3039557cea66" />



---

## Part 5: Load Testing with k6

### 5.1 Install k6

```bash
# On Ubuntu/Debian
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# On macOS
brew install k6

# On Windows
choco install k6
```

### 5.2 Configure Load Test Script

Update the `cloud-ws-test.js` file with your actual ALB endpoint:
- Replace `ALB_ENDPOINT` with your actual ALB DNS name
- Verify the WebSocket path matches your application (common patterns: /ws, /websocket, /socket.io)

```bash
# Edit the k6 test script
nano cloud-ws-test.js
```

### 5.3 Run Load Tests

```bash
# Test with both servers running
k6 run cloud-ws-test.js

# Simulate server failure during test (stop one server mid-test)
# Run test again and observe behavior

# For cloud testing (optional)
k6 cloud cloud-ws-test.js
```

**Case 3: k6 Load Test Results**
<img width="1919" height="933" alt="Screenshot from 2025-07-14 19-38-22" src="https://github.com/user-attachments/assets/d3039a41-8b8e-4301-9306-e73ae06ef682" />
<img width="1919" height="933" alt="Screenshot from 2025-07-14 19-46-09" src="https://github.com/user-attachments/assets/28ec40be-cb5a-46e8-9641-1d35aae09cdb" />



- `{instance!="localhost"}` - Not equal

---

## Part 6: Analysis and Observations

### 6.1 Expected Behaviors

- **Both Servers Healthy**: Load distributed across both instances
- **One Server Down**: All traffic redirected to healthy server
- **Load Testing**: WebSocket connections and message rates visible in dashboard
- **Recovery**: Metrics return to normal when failed server is restored

---

## Cleanup

```bash
# Stop monitoring stack
docker-compose down

# Remove volumes (optional)
docker-compose down -v

# Clean up AWS resources
# - Terminate EC2 instances
# - Delete Load Balancer
# - Clean up security groups
```

---

## Troubleshooting

### Common Issues

**Prometheus can't reach targets:**
- Check security groups allow port 80
- Verify EC2 instances are running  
- Check /metrics endpoint accessibility

**Grafana dashboard not loading:**
- Run configure-grafana.sh again
- Check Grafana logs: `docker logs monitoring-grafana-1`

**k6 WebSocket connection fails:**
- Verify WebSocket path (/ws)
- Check ALB configuration for WebSocket support
- Test WebSocket manually with wscat

### Verification Commands

```bash
# Test individual components
curl http://server-ip:80/health
curl http://server-ip:80/metrics
curl http://alb-endpoint/health

# Test WebSocket manually
npm install -g wscat
wscat -c ws://your-alb-endpoint/ws/test-client
```

---

## Lab Summary

This lab demonstrates:
- Real-world application deployment patterns
- Infrastructure monitoring best practices
- Chaos engineering techniques
- Load testing methodologies
- Observability and alerting setup

You now have a complete monitoring and testing pipeline for distributed applications running on AWS infrastructure.

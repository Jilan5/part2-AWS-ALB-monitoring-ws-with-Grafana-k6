# AWS Chat Application Monitoring and Load Testing Lab

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

## Part 1: Deploy Chat Application to AWS

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

---

## Part 2: Set Up Local Monitoring

### 2.1 Clone Monitoring Configuration

```bash
# Clone the monitoring configuration
git clone <Current REPO>
cd /monitoring
```

### 2.2 Configure Prometheus Targets

Update the `prometheus.yml` file with your actual EC2 public IPs and ALB endpoint:
- Replace `YOUR_SERVER_1_IP` with Server 1 public IP
- Replace `YOUR_SERVER_2_IP` with Server 2 public IP  
- Replace `YOUR_ALB_ENDPOINT` with ALB DNS name
- Replace `YOUR_REDIS_IP` with Redis server public IP

```bash
# Edit prometheus.yml file
nano prometheus.yml
```

### 2.3 Start Monitoring Stack

```bash
# Launch Prometheus and Grafana
docker-compose up -d

# Verify containers are running
docker ps

# Check Prometheus is scraping targets
curl http://localhost:9090/targets
```

### 2.4 Configure Grafana Dashboard

```bash
# Wait for Grafana to start, then run the configuration script
chmod +x configure-grafana.sh
./configure-grafana.sh

# Access Grafana
# URL: http://localhost:3000
# Username: admin
# Password: admin123
```

**Screenshot Space: Grafana Dashboard - Both Servers Running**
![Both Servers Healthy](screenshots/both-servers-healthy-1.png)
![Both Servers Metrics](screenshots/both-servers-healthy-2.png)

---

## Part 3: Chaos Testing - Simulate Server Failure

### 3.1 Stop One Server Instance

```bash
# SSH to one of your EC2 instances
ssh -i your-key.pem ubuntu@server-2-ip

# Stop the chat application container
sudo docker stop chat-app-container-name

# Or stop the entire instance from AWS Console
```

### 3.2 Observe Metrics During Failure

```bash
# Check Prometheus targets status
curl http://localhost:9090/api/v1/targets | grep health

# Monitor Grafana dashboard for changes
# Watch for:
# - Server health status changes
# - Traffic redistribution to remaining server
# - Connection handling behavior
```

**Screenshot Space: Grafana Dashboard - One Server Down**
![One Server Down Alert](screenshots/one-server-down-1.png)
![Traffic Redistribution](screenshots/one-server-down-2.png)

---

## Part 4: Load Testing with k6

### 4.1 Install k6

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

### 4.2 Configure Load Test Script

Update the `cloud-ws-test.js` file with your actual ALB endpoint:
- Replace `ALB_ENDPOINT` with your actual ALB DNS name
- Verify the WebSocket path matches your application (common patterns: /ws, /websocket, /socket.io)

```bash
# Edit the k6 test script
nano cloud-ws-test.js
```

### 4.3 Run Load Tests

```bash
# Test with both servers running
k6 run cloud-ws-test.js

# Simulate server failure during test (stop one server mid-test)
# Run test again and observe behavior

# For cloud testing (optional)
k6 cloud cloud-ws-test.js
```

**Screenshot Space: k6 Load Test Results**
![k6 Test Results Both Servers](screenshots/k6-test-both-servers.png)
![k6 Test Results One Server](screenshots/k6-test-one-server.png)

---

## Part 5: Analysis and Observations

### 5.1 Expected Behaviors

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

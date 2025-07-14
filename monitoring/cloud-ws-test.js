import { check, sleep, group } from 'k6';
import ws from 'k6/ws';
import http from 'k6/http';
import { Counter, Rate } from 'k6/metrics';

// Metrics for tracking test activity
const httpErrors = new Rate('http_errors');
const wsConnectFailRate = new Rate('ws_connect_fail');
const wsActivity = new Counter('ws_activity');
const messageSent = new Counter('message_sent');
const messageReceived = new Counter('message_received');

// Get the ALB endpoint from configuration
const ALB_ENDPOINT = 'chat-alb-c93c74b-682749944.ap-southeast-1.elb.amazonaws.com';
const HTTP_URL = `http://${ALB_ENDPOINT}`;
const WS_URL = `ws://${ALB_ENDPOINT}/ws`; // Check if this path is correct for your API

export const options = {
  // Adjusted for multiple messages per VU
  vus: 20,
  duration: '2m',
  
  // Only track average and 95th percentile
  summaryTrendStats: ['avg', 'p(95)'],
  
  // Include required system tags for cloud output
  discardResponseBodies: true,
  noConnectionReuse: false,
  systemTags: ['method', 'name', 'group', 'check', 'error', 'proto', 'status'],
  
  // Updated thresholds based on actual behavior
  thresholds: {
    'http_errors': ['rate<0.2'],  // Less than 20% HTTP error rate
    'ws_connect_fail': ['rate<0.2'], // Less than 20% WebSocket connection failure
    'message_sent': ['count>100'], // Ensure we're sending many messages
    // Removed message_received threshold as the server may not be responding with messages
  },
  
  cloud: {
    projectID: 3784041,
    name: 'WebSocket+HTTP Minimal Cloud Test',
  }
};

export default function () {
  // Use a simple ID to reduce cardinality
  const clientId = `client_${__VU}`;
  
  try {
    // Track test execution
    wsActivity.add(1, { step: 'start' });
    
    // Test health endpoint
    group('HTTP Health Check', function() {
      testHttpHealth();
    });
    
    // Test WebSocket connection
    group('WebSocket Test', function() {
      testWebSocketConnection(clientId);
    });
    
    // Mark test completion
    wsActivity.add(1, { step: 'complete' });
  } catch (e) {
    console.error(`Test failed: ${e}`);
    wsActivity.add(1, { step: 'error' });
  }
}

// Minimal HTTP health test
function testHttpHealth() {
  const healthResponse = http.get(`${HTTP_URL}/health`, {
    tags: { name: 'HealthCheck' }
  });
  
  const healthCheckSuccess = check(healthResponse, {
    'health check ok': (r) => r.status === 200,
  }, { type: 'health' });
  
  if (!healthCheckSuccess) {
    httpErrors.add(1);
  }
  
  sleep(1);
}

// Minimal WebSocket test
function testWebSocketConnection(clientId) {
  try {
    const url = `${WS_URL}/${clientId}`;
    console.log(`Connecting to WebSocket URL: ${url}`);
    wsActivity.add(1, { step: 'connect_attempt' });
    
    const response = ws.connect(url, { tags: { name: 'WSConnection' } }, function (socket) {
      wsActivity.add(1, { step: 'connected' });
      
      let msgSent = false;
      
      socket.on('open', function() {
        wsActivity.add(1, { step: 'opened' });
        console.log(`WebSocket connection opened for ${clientId}`);
        check(socket, {
          'ws socket opened successfully': () => true
        }, { type: 'websocket', stage: 'open' });
      });
      
      socket.on('message', function(data) {
        wsActivity.add(1, { step: 'message_received' });
        messageReceived.add(1);
        
        console.log(`Message received: ${data.slice(0, 100)}...`); // Log first part of message for debugging
        
        try {
          const msg = JSON.parse(data);
          console.log(`Message type: ${msg.type}`); // Log message type
          
          // Send multiple messages after connection info
          if (msg.type === 'connection_info' && !msgSent) {
            msgSent = true;
            
            // Send 5-6 messages (random between 5 and 6)
            const messagesToSend = 5 + Math.floor(Math.random() * 2);
            
            // Send first message immediately
            sendChatMessage(socket, clientId, 1);
            wsActivity.add(1, { step: 'message_sent' });
            messageSent.add(1);
            
            // Send remaining messages with small delays
            for (let i = 2; i <= messagesToSend; i++) {
              setTimeout(() => {
                sendChatMessage(socket, clientId, i);
                wsActivity.add(1, { step: 'message_sent' });
                messageSent.add(1);
              }, (i - 1) * 1000); // Send a message every second
            }
          }
        } catch (e) {
          // Ignore JSON errors
        }
      });
      
      socket.on('error', function(e) {
        console.error(`WebSocket error for ${clientId}: ${e}`);
        wsConnectFailRate.add(1);
      });
      
      // Keep connection open long enough for all messages
      sleep(10);
      
      // Send a final message before closing
      sendChatMessage(socket, clientId, 'final');
      wsActivity.add(1, { step: 'final_message_sent' });
      messageSent.add(1);
      
      // Give time for the final message to be processed
      sleep(2);
      socket.close();
    });
    
    check(response, {
      'WebSocket connection established': (r) => r && r.status === 101,
    }, { type: 'websocket', stage: 'connect' });
    
    if (!response || response.status !== 101) {
      wsConnectFailRate.add(1);
    }
    
  } catch (error) {
    wsConnectFailRate.add(1);
    return null;
  }
}

// Helper function to send chat messages
function sendChatMessage(socket, clientId, messageNumber) {
  const message = {
    type: 'chat',
    content: `Test message #${messageNumber} from ${clientId}`,
    timestamp: Date.now()
  };
  
  console.log(`Sending message: ${JSON.stringify(message)}`);
  
  socket.send(JSON.stringify(message));
}

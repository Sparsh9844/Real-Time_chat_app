# Scalable Real-Time Chat Application

A production-inspired real-time private chat application built using **React, Node.js, Socket.IO, Redis, NGINX, and Docker**. The application supports private messaging, typing indicators, message delivery status, message deletion, and horizontal scaling across multiple Node.js server instances.

---

# Project Overview

Most chat applications are initially built using a single backend server. This project goes a step further by implementing a **horizontally scalable architecture** where multiple backend instances work together seamlessly.

The application demonstrates concepts used in modern messaging platforms such as **WhatsApp, Discord, Slack, and Microsoft Teams**.

---

# ✨ Features

## User Management

* Join chat with a username
* View online users
* Select users for one-to-one private chat
* Online user synchronization across servers

## Real-Time Messaging

* Private one-to-one messaging
* Real-time message delivery
* Typing indicators
* Message delivery ticks (✓, ✓✓)
* Delete messages for everyone
* Automatic synchronization across backend instances

## Scalability Features

* Multiple Node.js backend servers
* Redis Pub/Sub integration
* Socket.IO Redis Adapter
* NGINX load balancing
* Docker containerization
* Distributed event synchronization

---

# System Architecture

```text
                React Client
                      │
                      ▼
             NGINX Load Balancer
                      │
          ┌───────────┴───────────┐
          │                       │
          ▼                       ▼
   Node Server :3001      Node Server :3002
          │                       │
          └───────────┬───────────┘
                      │
                      ▼
                Redis Pub/Sub
```

---

# Tech Stack

### Frontend

* React.js
* Tailwind CSS
* Socket.IO Client
* Vite

### Backend

* Node.js
* Express.js
* Socket.IO

### Infrastructure & DevOps

* Redis
* NGINX
* Docker
* Docker Compose

---

# 📂 Project Structure

```text
SCALABLE-CHAT
│
├── .git
│
└── scalable-chat-app
    │
    ├── client
    │   ├── public
    │   ├── src
    │   ├── .gitignore
    │   ├── index.html
    │   ├── package.json
    │   ├── package-lock.json
    │   ├── vite.config.js
    │   ├── eslint.config.js
    │   └── README.md
    │
    ├── nginx
    │   └── nginx.conf
    │
    ├── server
    │   ├── src
    │   │   ├── config
    │   │   │   └── redisAdapter.js
    │   │   ├── app.js
    │   │   ├── server.js
    │   │   └── socket.js
    │   ├── package.json
    │   └── package-lock.json
    │
    ├── .gitignore
    ├── docker-compose.yml
    └── README.md
```

---

# Installation

## Clone Repository

```bash
git clone https://github.com/your-username/scalable-chat-app.git
cd scalable-chat-app
```

---

# Install Dependencies

### Frontend

```bash
cd client
npm install
```

### Backend

```bash
cd ../server
npm install
```

---

# 🐳 Start Infrastructure

## Start Redis and NGINX

```bash
docker compose up -d
```

Check running containers:

```bash
docker ps
```

---

# Start Backend Servers

### Terminal 1

```bash
cd server
npm run dev
```

Runs on:

```text
http://localhost:3001
```

---

### Terminal 2

Git Bash:

```bash
PORT=3002 npm run dev
```

PowerShell:

```powershell
$env:PORT=3002
npm run dev
```

Runs on:

```text
http://localhost:3002
```

---

# Start Frontend

```bash
cd client
npm run dev
```

Application:

```text
http://localhost:5173
```

---

# ⚙️ How Scaling Works

## Without Redis

```text
Client A
   │
Server 1

Client B
   │
Server 2
```

Server 1 cannot communicate with Server 2.

Messages fail.

---

## With Redis Adapter

```text
Client A
   │
Server 1
   │
 Redis
   │
Server 2
   │
Client B
```

Redis synchronizes Socket.IO events between backend instances, allowing users connected to different servers to communicate seamlessly.

---

# Load Balancing Flow

```text
React Client
      │
      ▼
NGINX Load Balancer
      │
 ┌────┴────┐
 │         │
 ▼         ▼
3001      3002
```

NGINX distributes incoming WebSocket connections between available backend instances.

---

# 🔥 Key Concepts Implemented

* WebSockets
* Socket.IO Events
* Private Messaging
* Typing Indicators
* Message Delivery Status
* Message Deletion
* Online Presence System
* Redis Pub/Sub
* Horizontal Scaling
* Load Balancing
* Docker Containerization
* Distributed System Communication

---

# 🎯 Challenges Solved

### Problem

Socket.IO stores connected users in server memory.

```text
Server 1 ❌ does not know users on Server 2
```

### Solution

Redis Adapter synchronizes events across all backend instances.

```text
Server 1
   │
 Redis
   │
Server 2
```

All servers behave like a single real-time system.

---

# 📈 Future Improvements

* MongoDB Message Persistence
* Group Chats
* Last Seen Status
* Read Receipts
* File & Image Sharing
* Voice Messages
* End-to-End Encryption
* Kubernetes Deployment
* CI/CD Pipeline
* Cloud Deployment

---

# Explanation

This project started as a traditional Socket.IO application running on a single Node.js server. To make it production-ready and scalable, I introduced multiple backend instances and placed NGINX in front as a load balancer.

The major challenge was that Socket.IO stores connected clients in memory, so one server instance cannot see users connected to another instance. I solved this problem using Redis Pub/Sub through the Socket.IO Redis Adapter. Redis synchronizes events between all backend instances, allowing users connected to different servers to exchange messages seamlessly.

This architecture demonstrates concepts used in large-scale real-time systems such as WhatsApp, Slack, Discord, and Microsoft Teams.

---

# Author

**Sparsh Chauhan**

B.Tech CSE Student | Full Stack Developer | MERN Stack Enthusiast | Real-Time Systems & Scalable Backend Engineering

⭐ If you found this project helpful, consider giving it a star!

# Mediasoup-tutorial-react-nestjs

a simple example of mediasoup, an open source library. The front-end server used React and the back-end server used NestJS. Personally, I think the most important part is to think about how to manage the various resources, rooms, and users below.

한국어 글(korean):
https://smaivnn.tistory.com/28

# Screenshot

<img width="539" alt="mediasoup demo" src="https://github.com/user-attachments/assets/0e4672a2-63fa-4419-8482-3c23760bdb86">

# Structure

### map resource

```
MediasoupService
├── Worker[] (workers)
    ├── Router[] (routers)
        ├── Room[] (rooms)
            ├── Peer[] (peers)
                ├── Transport[] (transports)
                ├── Producer[] (producers)
                └── Consumer[] (consumers)

```

# Resource Description

These are the various resources needed to use mediasoup.

## Worker

Worker is a central component of mediasoup. It is the lowest-level process of mediasoup and is responsible for media processing. Other resources below are created and **managed in worker**. WebRTC connection work and communication between processes are performed on them. It can be created as many as the number of cpu cores.

## Router

The Router in mediasoup serves as an RTP (Routing and Translation Point). Each Router functions as an SFU (Selective Forwarding Unit), performing tasks such as routing packets received from Producers to Consumers, thereby establishing connections. By default, Producers and Consumers that belong to the same Router can only connect directly with each other. The Router routes RTP packets and connects participants who share the same RTP capabilities. It also manages Transports, Producers, and Consumers.

It is important to note that a Router does not necessarily correspond to a single room. While it is common to implement one Router per room, multiple rooms can share a single Router, or a single room can utilize multiple Routers. This depends on the design of the application.

To connect a Producer and a Consumer that are on different Routers, you need to use a PipeTransport to establish a connection between the Routers. This allows media streams to be exchanged between participants who are on different Routers.

Considerations when connecting between different Routers:

- **Increased latency :** Since packets must traverse multiple Routers, a slight increase in latency may occur.

- **Increased complexity in resource management :** Managing multiple Routers and PipeTransports adds complexity to the system.
  However, when configured correctly, these impacts can be minimized, and stable connections can be maintained through the use of PipeTransports.

## Transport

Transport is an abstract concept that represents the network connection between the client and the server. It provides a transmission path for media streams and actually handles the encapsulation and transmission of RTP/RTCP packets. For easier understanding, it can be thought of as a "path." Additionally, Transport handles network protocol negotiations such as DTLS and ICE.

Both the client and the server use **Send** and **Receive** Transports.

**Client-side Transport**

- SendTransport: Used when the client sends media to the server.
- RecvTransport: Used when the client receives media from the server.

**Server-side Transport**

- The server creates corresponding Transports matching the client.
- It uses WebRtcTransport to handle WebRTC connections with the client.

**Send/Receive Direction of Transport**

While Transport itself does not have a send or receive direction, it is practically distinguished according to its role.

- SendTransport: Mainly used to create Producers to send media.
- RecvTransport: Mainly used to create Consumers to receive media.

## Producer

A Producer is an entity that creates real-time media streams. It can generate audio, video, and data streams, and each stream is treated separately. For example, an audio Producer and a video Producer are managed as separate Producers.

The Producer sends the client's media stream to the mediasoup server via the SendTransport. It transmits the client's media tracks (MediaStreamTrack) to the server, where they are registered with the server's Router so that other participants can subscribe to them through Consumers.

## Consumer

A Consumer is an entity that receives real-time media streams. It can receive audio, video, and data streams, and it receives media streams from the mediasoup server via the RecvTransport to deliver them to the client.

The Consumer represents the media stream sent from the server to the client, subscribing to other participants' Producers to receive media. It obtains the Producer's media from the server's Router, delivers it to the client, and the client can play other participants' media through the Consumer.

# Flow

![image](https://github.com/user-attachments/assets/96998b4e-62bc-404c-8d49-601de9ac7354)

# How to Run

## Version

### client

    "react": "^18.2.0",
    "mediasoup-client": "^3.7.2",
    "socket.io-client": "^4.7.3",

### server

    "NestJS": "^10.0.0",
    "mediasoup": "^3.13.16",
    "socket.io": "^4.7.3",

## Install

1. **Clone the repository:**

```bash
git clone https://github.com/smaivnn/mediasoup-tutorial-react-nestjs.git
cd mediasoup-tutorial-react-nestjs
```

2. **Install dependencies for the client:**

```
cd client
npm install
```

3. **Install dependencies for the server:**

```
cd ../server
npm install
```

4. **Run the client (React should be configured to use HTTPS):**

```
cd ../client
npm run start
```

5. **Run the server:**

```
cd ../server
npm run start:dev
```

6. **Open your browser and navigate to** https://localhost:3000

   Now you should have both the client and server running, and you can start using the mediasoup example.

# Additional Resources

- Mediasoup Homepage: https://mediasoup.org/
- Mediasoup Forum: https://mediasoup.discourse.group/
- My blog: https://smaivnn.tistory.com/28

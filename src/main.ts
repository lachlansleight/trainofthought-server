import http = require("http");
import express = require("express");
import { Server } from "socket.io";
import { Deepgram } from "@deepgram/sdk";
import setupHttpEndpoints from "./httpEndpoints";
require("dotenv").config();

const startServer = () => {
    const app = express();
    setupHttpEndpoints(app);

    const server = http.createServer(app);
    const io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
        },
    });

    const deepgram = new Deepgram(process.env.DEEPGRAM_API_KEY || "");

    io.on("connection", socket => {
        const sampleRate = socket.handshake.query.sampleRate;

        console.log("Socket.io client connected", socket.id, sampleRate);
        const deepgramSocket = deepgram.transcription.live({
            punctuate: true,
            interim_results: true,
            model: "general",
            language: "en-AU",
            tier: "nova",
        });

        deepgramSocket.addListener("open", () => {
            socket.emit("ready");

            socket.on("audio", data => {
                if (!data) return;
                if (deepgramSocket.getReadyState() !== 1) return;
                deepgramSocket.send(data);
            });
        });

        deepgramSocket.addListener("transcriptReceived", json => {
            const transcription = JSON.parse(json);
            if ((transcription.channel?.alternatives?.length || 0) === 0) {
                return;
            }
            const data = {
                duration: transcription.duration,
                start: transcription.start,
                isFinal: transcription.is_final,
                speechFinal: transcription.speech_final,
                text: transcription.channel.alternatives[0].transcript,
                confidence: transcription.channel.alternatives[0].confidence,
                words: transcription.channel.alternatives[0].words,
            };
            console.log(data.text);
            socket.emit("transcription", data);
        });

        deepgramSocket.addListener("close", e => {
            console.log("Deepgram connection closed", { code: e.code, reason: e.reason });
        });

        socket.on("disconnect", () => {
            deepgramSocket.finish();
            console.log("Socket.io client disconnected", socket.id);
        });
    });

    const PORT = process.env.PORT || 3742;
    const serverHandle = server.listen(PORT, () => {
        console.log(`Server listening on port ${PORT}`);
    });
    return serverHandle;
};

startServer();

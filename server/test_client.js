const { io } = require("socket.io-client");
const socket = io("http://localhost:5001");
const roomId = "0KQWBT"; // Or any random room 
let expectedRound = 0;

socket.on("connect", () => {
    console.log("[TEST] Connected.");
    socket.emit("joinRoom", {
        userId: "admin-" + Date.now(),
        roomId: "TEST_DEBUG",
        name: "TestBot",
        team: "CSK",
        spectator: false
    }, (res) => {
        console.log("[TEST] joinRoom:", res.ok ? "Success" : res.error);
        if (res.ok) {
            socket.emit("startAuction", { roomId: "TEST_DEBUG", timerSeconds: 10 }, (st) => {
                console.log("[TEST] startAuction:", st.ok ? "Started" : st.message);
            });
        }
    });
});

socket.on("timerUpdate", (payload) => {
    console.log(`[TIMER_UPDATE] timerSeconds: ${payload.timerSeconds}, roundId: ${payload.roundId}`);
});

socket.on("newPlayer", (payload) => {
    console.log(`[NEW_PLAYER] player: ${payload.currentPlayer?.name}, roundId: ${payload.roundId}, timerSeconds: ${payload.timerSeconds}`);
});

socket.on("playerSold", (payload) => {
    console.log(`[PLAYER_SOLD] result: ${payload.result}, delayMs: ${payload.delayMs}`);
});

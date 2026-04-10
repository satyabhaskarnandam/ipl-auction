const { io } = require("socket.io-client");

const socket = io("http://localhost:5001");

socket.on("connect", () => {
    console.log("Connected to server");
    
    // Create a room first
    socket.emit("createRoom", {
        name: "TestAdmin",
        team: "CSK",
        userId: "admin1",
        auctionType: "mega"
    }, (response) => {
        if (!response.ok) {
            console.error("Create room failed:", response.message);
            process.exit(1);
        }
        
        const roomId = response.roomId;
        console.log("Room created:", roomId);
        
        // Try to start accelerated round (should fail as no one is unsold)
        socket.emit("startAcceleratedRound", { roomId }, (result) => {
            console.log("Accelerated Round result (should be error):", result);
            if (result && !result.ok && result.message === "No unsold players available") {
                console.log("SUCCESS: Warning returned correctly!");
            } else {
                console.error("FAILURE: Incorrect response for empty pool");
            }
            process.exit(0);
        });
    });
});

socket.on("connect_error", (err) => {
    console.error("Connection error:", err.message);
    process.exit(1);
});

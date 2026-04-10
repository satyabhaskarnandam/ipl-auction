const { io } = require("socket.io-client");

const socket = io("http://127.0.0.1:5001", { transports: ["websocket"] });

socket.on("connect", () => {
    console.log("Connected to server");
    
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
        
        // At this point, unsold pool is 0
        socket.emit("startAcceleratedRound", { roomId }, (result) => {
            console.log("Accelerated Round result (EMPTY POOL):", result);
            if (result && !result.ok && result.message === "No unsold players available") {
                console.log("SUCCESS: Warning returned correctly!");
            } else {
                console.error("FAILURE: Incorrect response for empty pool");
                process.exit(1);
            }
            
            // Now let's try with 1 unsold player
            // But we need to start auction first.
            socket.emit("startAuction", { roomId }, (startRes) => {
                console.log("Auction started:", startRes);
                
                // Now manually close the current player as UNSOLD
                // We'll wait a bit for the player to be assigned.
                setTimeout(() => {
                    socket.emit("closeCurrentPlayer", { roomId }, (closeRes) => {
                        console.log("Player closed:", closeRes);
                        
                        // Now the pool should have 1 player
                        socket.emit("startAcceleratedRound", { roomId }, (finalRes) => {
                            console.log("Accelerated Round result (1 PLAYER):", finalRes);
                            if (finalRes && finalRes.ok) {
                                console.log("SUCCESS: Accelerated Round started perfectly with 1 player!");
                            } else {
                                console.error("FAILURE: Could not start with 1 player");
                                process.exit(1);
                            }
                            process.exit(0);
                        });
                    });
                }, 1000);
            });
        });
    });
});

socket.on("connect_error", (err) => {
    console.error("Connection error:", err.message);
    process.exit(1);
});

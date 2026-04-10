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
        const roomId = response.roomId;
        console.log("Room created:", roomId);
        
        socket.emit("startAuction", { roomId }, () => {
            console.log("Auction started, waiting for player...");
            
            // Wait for SET_INTRO_DELAY_MS (3000ms) + buffer
            setTimeout(() => {
                socket.emit("closeCurrentPlayer", { roomId }, () => {
                    console.log("Player closed as unsold.");
                    
                    setTimeout(() => {
                        socket.emit("startAcceleratedRound", { roomId }, (result) => {
                            console.log("Accelerated Round result (1 player):", result);
                            if (result && result.ok) {
                                console.log("SUCCESS: Accelerated Round started with 1 player!");
                            } else {
                                console.error("FAILURE:", result?.message);
                                process.exit(1);
                            }
                            process.exit(0);
                        });
                    }, 500);
                });
            }, 6000); // 6 seconds to be safe
        });
    });
});

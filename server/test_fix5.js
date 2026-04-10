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
            console.log("Auction started...");
            
            setTimeout(() => {
                socket.emit("closeCurrentPlayer", { roomId }, () => {
                    console.log("Player 1 (Kane) closed as UNSOLD.");
                    
                    // Now start accelerated round
                    socket.emit("startAcceleratedRound", { roomId }, (accRes) => {
                        console.log("Accelerated Round started:", accRes);
                        
                        // Wait for player to be assigned in accelerated round
                        setTimeout(() => {
                            // Check the player list to see if Kane is PENDING and in correct set
                            // Actually we'll just close him again.
                            socket.emit("closeCurrentPlayer", { roomId }, () => {
                                console.log("Kane closed as unsold in Accelerated Round.");
                                
                                // Now check if Kane is UNSOLD_FINAL and excluded from next call
                                socket.emit("startAcceleratedRound", { roomId }, (finalRes) => {
                                    console.log("Second Accelerated click result (should be error):", finalRes);
                                    if (finalRes && !finalRes.ok && finalRes.message === "No unsold players available") {
                                        console.log("SUCCESS: Infinite loop prevented!");
                                    } else {
                                        console.error("FAILURE: Infinite loop detected or incorrect response");
                                        process.exit(1);
                                    }
                                    process.exit(0);
                                });
                            });
                        }, 5000); // Wait for transition
                    });
                });
            }, 5000);
        });
    });
});

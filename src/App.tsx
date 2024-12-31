import React, { useRef, useState, useEffect } from "react";

const App: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isDetectionStarted, setIsDetectionStarted] = useState(false);
  const intervalRef = useRef<number | null>(null);

  // Modified WebSocket connection
  useEffect(() => {
    const connectWebSocket = () => {
      const websocket = new WebSocket("ws://localhost:8000/ws/yolo");

      websocket.onopen = () => {
        console.log("WebSocket connection opened.");
        setWs(websocket);
      };

      websocket.onclose = () => {
        console.log("WebSocket connection closed.");
        setWs(null);
        setIsDetectionStarted(false);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };

      websocket.onerror = (error) => {
        console.error("WebSocket error:", error);
      };
    };

    connectWebSocket();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);

  // Modified webcam initialization
  useEffect(() => {
    if (videoRef.current) {
      navigator.mediaDevices
        .getUserMedia({ 
          video: {
            width: 640,
            height: 480,
            facingMode: 'user'
          } 
        })
        .then((stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            // Ensure video is playing before capturing frames
            videoRef.current.play();
          }
        })
        .catch((err) => {
          console.error("Error accessing webcam: ", err);
        });
    }
  }, []);

  // Modified capture function
  const captureAndSendFrame = async () => {
    if (!videoRef.current || !ws || ws.readyState !== WebSocket.OPEN) return;
    
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    // Ensure video is playing and has valid dimensions
    if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      // Set canvas dimensions to match video
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;

      // Draw current frame
      context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

      // Send frame data
      const frameData = canvas.toDataURL("image/jpeg", 0.8).split(",")[1];
      ws.send(frameData);
    }
  };

  // Start detection
  const startDetection = () => {
    setIsDetectionStarted(true);
    intervalRef.current = window.setInterval(captureAndSendFrame, 33); // ~30 FPS
  };

  // Modified stop detection
  const stopDetection = () => {
    setIsDetectionStarted(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Modified to handle received detection results
  const handleReceivedDetection = (event: MessageEvent) => {
    const frameData = event.data;
    if (frameData && canvasRef.current) {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = img.width;
          canvas.height = img.height;
          const context = canvas.getContext("2d");
          if (context) {
            context.drawImage(img, 0, 0);
          }
        }
      };
      img.src = `data:image/jpeg;base64,${frameData}`;
    }
  };

  // WebSocket listeners for receiving detection results
  useEffect(() => {
    if (ws) {
      ws.onmessage = handleReceivedDetection;
    }
  }, [ws]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <div className="App">
      <h1>YOLOv8 Real-Time Object Detection</h1>
      <div>
        <video
          ref={videoRef}
          width="640"
          height="480"
          autoPlay
          playsInline
          muted
          style={{ display: "none" }}
        />
        
        <canvas
          ref={canvasRef}
          width="640"
          height="480"
          style={{
            border: "1px solid black",
            backgroundColor: "#000000" // Add background color
          }}
        />

        <div>
          {!isDetectionStarted ? (
            <button onClick={startDetection}>Start Detection</button>
          ) : (
            <button onClick={stopDetection}>Stop Detection</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;

import React, { useState, useEffect, useRef } from 'react';

const App: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectionCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const yoloWs = useRef<WebSocket | null>(null);
  const generalWs = useRef<WebSocket | null>(null);
  const detectionWs = useRef<WebSocket | null>(null);

  const [isDetectionFeed, setIsDetectionFeed] = useState(false);

  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState<string>("");
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Connect to the WebSocket server
    generalWs.current = new WebSocket("ws://localhost:8000/ws");

    generalWs.current.onopen = () => console.log("Connected to WebSocket server");
    generalWs.current.onmessage = (event) => {
      console.log("Received:", event.data);
      setMessages((prev) => [...prev, event.data]);
    };

    generalWs.current.onerror = (error) => console.error("WebSocket error:", error);
    generalWs.current.onclose = () => console.log("WebSocket connection closed");

    // detectionWs.current = new WebSocket("ws://localhost:8000/ws/detect");
    // detectionWs.current.onopen = () => {
    //   console.log("Detection websocket connceted");
    // };

    // detectionWs.current.onmessage = (event) => {
    //   const image = new Image();
    //   image.src = `data:image/jpeg;base64,${event.data}`;
    //   image.onload = () => {
    //     const ctx = canvasRef.current?.getContext("2d");
    //     ctx?.drawImage(image, 0, 0, canvasRef.current!.width, canvasRef.current!.height);
    //   };
    // };

    // detectionWs.current.onerror = (error) => {
    //   console.error("Detection websocket error", error)
    // }

    // detectionWs.current.onclose = () => {
    //   console.log("Detection websocket connection closed.")
    // }
    
    yoloWs.current = new WebSocket("ws://localhost:8000/ws/yolo");

    yoloWs.current.onopen = () => {
      console.log("Yolov websocket connected");
    };
    
    yoloWs.current.onmessage = (event) => {
      console.log("received detection result")
      const image = new Image();
      image.src = `data:image/jpeg;base64,${event.data}`;
      image.onload = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (ctx && canvas) {
          // Draw the received image with bounding boxes on the canvas
          ctx.clearRect(0, 0, canvas.width, canvas.height);  // Clear previous content
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        } else console.error("canvas context is null or canvas is not available")
        // if (ctx) {
        //   ctx.drawImage(image, 0, 0, canvasRef.current!.width, canvasRef.current!.height);
        // } else console.error("canvas context not found")
      // ctx?.drawImage(image, 0, 0, canvasRef.current!.width, canvasRef.current!.height);
      };
    };

    yoloWs.current.onerror = (error) => {
      console.error("Yolo websocket error:", error);
    }

    yoloWs.current.onclose = () => {
      console.log("yolo websocket connection closed");
    }

    navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    })

    return () => {
      generalWs.current?.close();
      detectionWs.current?.close();
      yoloWs.current?.close(); 
    };
  }, []);

  useEffect(() => {
    const startvideoStream = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      if(videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();;
      }
    };
    startvideoStream();
  }, []);
  
  const captureFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if(video && canvas){
      const ctx = canvas.getContext('2d');
      if(ctx){
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const frameData = canvas.toDataURL("image/jpeg");
        generalWs.current?.send(frameData.split(",")[1]);
      }
    }
  }

  useEffect(() => {
    const interval = setInterval(captureFrame, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h1>Hello chalu hai </h1>
      <video ref={videoRef} style={{ display: "none" }}></video>
      <canvas ref={canvasRef} width="640" height="480" style={{ display: "none" }}></canvas>
      <canvas ref={detectionCanvasRef} width="640" height="480"></canvas>
    </div>
  )

  const sendFrameForDetection = () => {
    if (!yoloWs.current || yoloWs.current.readyState !== WebSocket.OPEN) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (videoRef.current && ctx) {
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (blob) {
          console.log("Frame sent to websocket");
          yoloWs.current?.send(blob);
        } else {
          console.error("Failed to create blob from canvas");
        }
      }, "image/jpeg");
    }
  };
  
  const toggleDetectionFeed = () => {
    setIsDetectionFeed(!isDetectionFeed);
  }

  const sendMessage = () => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(input);
      setInput(""); // Clear input field
    }
  };

  return (
    <div>
      <div>
        <h1>Yolo Real-time Detection</h1>
        <video ref={videoRef} autoPlay muted style={{ width: "500px" }}></video>
        <canvas ref={canvasRef} style={{ width: "500px" }}></canvas>
      </div>
      <div>
        <button onClick={sendFrameForDetection}>Send Frame for Yolo Detection</button>
        <button onClick={toggleDetectionFeed}>{isDetectionFeed ? "show live feed" : "show detection feed"}</button>
      </div>
     <div style={{ padding: "20px" }}>
       <h1>WebSocket Demo</h1>
       <div>
         <input
           type="text"
           value={input}
           onChange={(e) => setInput(e.target.value)}
           placeholder="Type a message" 
         />
         <button onClick={sendMessage}>Send</button>
       </div>
       <div style={{ marginTop: "20px" }}>
         <h2>Messages</h2>
         <ul>
           {messages.map((msg, index) => (
             <li key={index}>{msg}</li>
           ))}
         </ul>
       </div>
     </div>
    
    <h1>WebSocket Features</h1>

    {/* General WebSocket */}
    <button onClick={() => generalWs.current?.send("Hello Backend!")}>Send General Message</button>

    {/* Object Detection WebSocket */}
    {/* <video ref={videoRef} autoPlay muted style={{ width: "500px" }}></video> */}
    <canvas ref={canvasRef} style={{ width: "500px" }}></canvas>
    <button onClick={sendFrameForDetection}>Send Frame for Detection</button>
    
  </div>
  );
};

export default App;

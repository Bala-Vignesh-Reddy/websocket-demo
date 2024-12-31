import base64
import cv2
import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO

# Initialize FastAPI app
app = FastAPI()

# Allow CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize model globally
model = YOLO("yolov8n.pt")

# Configure model parameters for speed
model.conf = 0.5  # Confidence threshold
model.iou = 0.45  # NMS IOU threshold
model.max_det = 300  # Maximum detections per image

@app.websocket("/ws/yolo")
async def yolo_detection_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time YOLOv8 detection.
    """
    await websocket.accept()
    print("WebSocket connection opened")
    
    try:
        while True:
            try:
                data = await websocket.receive_text()
                if not data:
                    continue
                
                # Process frame and send response
                image_data = base64.b64decode(data)
                nparr = np.frombuffer(image_data, np.uint8)
                frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                
                if frame is None:
                    continue

                results = model(frame, stream=True)
                
                for r in results:
                    annotated_frame = r.plot()
                    _, buffer = cv2.imencode('.jpg', annotated_frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
                    encoded_frame = base64.b64encode(buffer).decode('utf-8')
                    await websocket.send_text(encoded_frame)
                    break

            except WebSocketDisconnect:
                print("Client disconnected")
                break
            except Exception as e:
                print(f"Frame processing error: {e}")
                continue

    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        await websocket.close()

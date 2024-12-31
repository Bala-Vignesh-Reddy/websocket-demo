import cv2
import base64
import numpy as np
from io import BytesIO
from PIL import Image
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from ultralytics import YOLO

app = FastAPI()

# Enable CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow requests from any origin
    allow_methods=["*"],
    allow_headers=["*"]
)

model = YOLO("yolov8n.pt")

@app.get("/")
def check():
    return {"message": "Welcome the server is working"}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    print("Websocket connection attempt")
    await websocket.accept()
    print("WebSocket connection established")
    try:
        while True:
            # Receive a message from the frontend
            data = await websocket.receive_text()
            print(f"Received: {data}")
            
            # Echo back the same message
            response = f"Echo: {data}"
            await websocket.send_text(response)
    except Exception as e:
        print("WebSocket connection closed", e)

@app.websocket("/ws/detect")
async def websocket_object_detection(websocket: WebSocket):
    """
    New websocket endpoint for object detection
    """
    await websocket.accept()
    print("Object detection websocket connection established.")
    try:
        while True:
            data = await websocket.receive_bytes()
            np_arr = np.frombuffer(data, np.uint8)
            frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

            height, width, _ = frame.shape
            start_point = (int(width * 0.3), int(height * 0.3))
            end_point = (int(width * 0.7), int(height * 0.7))
            color = (0, 255, 0)
            thickness = 2
            cv2.rectangle(frame, start_point, end_point, color, thickness)

            _, buffer = cv2.imencode(".jpg", frame)
            base64_frame = base64.b64encode(buffer).decode("utf-8")
            await websocket.send_text(base64_frame)

    except Exception as e:
        print(f"Websocket error: {e}")
    finally:
        await websocket.close()
        print("Object Detection websocket connection closed.")

@app.websocket("/ws/yolo-detection")
async def websocket_yolo_detection(websocket: WebSocket):
    await websocket.accept()
    print("YOLO Detection WebSocket connection established.")
    try:
        while True:
            print("Receiving data from websocket")
            data = await websocket.receive_bytes()
            # print(f"received frame of size: {len(data)} bytes")
            frame_data = base64.b64decode(data)
            nparr = np.frombuffer(frame_data, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            frame = cv2.resize(frame, (640, 480))

            results = model.predict(source=frame, save=False, show=False, conf=0.5)
            annotated_frame = results[0].plot()
            _, buffer = cv2.imencode(".jpg", annotated_frame)
            base64_frame = base64.b64encode(buffer).decode("utf-8")
            await websocket.send_text(base64_frame)

            # for only image
            # detections = results[0].boxes.xyxy
            # labels = results[0].boxes.cls
            # confidences = results[0].boxes.conf
            # for (bbox, label, confidence) in zip(detections, labels, confidences):
            #     x1, y1, x2, y2 = map(int, bbox.tolist())
            #     label_name = model.names[int(label)]
            #     conf = round(float(confidence), 2)
            #     cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
            #     cv2.putText(frame, f"{label_name} {conf}", (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

            #     _, buffer = cv2.imencode(".jpg", frame)
            #     if buffer is None:
            #         print("failed to encode processed frame.")
            #         continue
            #     base64_frame = base64.b64encode(buffer).decode("utf-8")
            #     await websocket.send_text(base64_frame)

    except Exception as e:
        print(f"Wesocket error: {e}")
    finally:
        await websocket.close()
        print("Yolo detection websocket connection closed")

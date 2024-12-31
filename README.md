# WebSocket Detection Project

This project is a WebSocket-based real-time detection system using a webcam feed and YOLOv8 for object detection. It uses a React frontend with TypeScript and a Python backend with FastAPI for real-time processing.

## Features

- WebSocket connection for real-time communication between frontend and backend.
- Capture webcam feed in the frontend and send it to the backend for processing.
- Use YOLOv8 model for object detection in real-time.
- Display detection results with bounding boxes on the frontend.
  
## Technologies Used

- **Frontend**: React, TypeScript, WebSocket
- **Backend**: Python, FastAPI, YOLOv8
- **Model**: YOLOv8 (You Only Look Once)

## Installation

### Frontend Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Run the frontend:
   ```bash
   npm run dev
   ```

### Backend Setup

1. Clone this repository:
   ```bash
   git clone https://github.com/Bala-Vignesh-Reddy/websocket-demo.git
   cd websocket-demo/backend  
   ```
2. Create a virtual environment:
   ```bash
   python -m venv env
   ```
3. Activate the virtual environment:
   - On Windows:
   ```bash
   env\Scripts\activate
   ```
   - On macOS and Linux:
   ```bash
   source env/bin/activate
   ```
4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
5. Run the FastAPI server:
   ```bash
   uvicorn app:app --reload
   ```

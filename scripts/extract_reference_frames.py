import cv2
import os

video_path = os.path.join(os.getcwd(), "reference.mp4")
output_dir = os.path.join(os.getcwd(), "reference_frames")
os.makedirs(output_dir, exist_ok=True)

cap = cv2.VideoCapture(video_path)
if not cap.isOpened():
    raise SystemExit("Failed to open reference.mp4")

frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
frames_to_capture = 8
interval = max(1, frame_count // frames_to_capture)

index = 0
saved = 0

while saved < frames_to_capture:
    ret, frame = cap.read()
    if not ret:
        break
    if index % interval == 0:
        path = os.path.join(output_dir, f"frame_{saved:02d}.png")
        cv2.imwrite(path, frame)
        saved += 1
    index += 1

cap.release()
print(f"Saved {saved} frames to {output_dir}")

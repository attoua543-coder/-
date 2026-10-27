# Live Video Streamer

Desktop application for streaming a previously recorded video to an RTMP server using `FFmpeg` and Electron.

## Quick start

1. Install project dependencies:
   ```bash
   npm install
   ```

2. Place the `ffmpeg.exe` file in the project root folder.
   - Example:
     ```text
     C:\projects\live-video-streamer\ffmpeg.exe
     ```

3. Run the app:
   ```bash
   npm start
   ```

## Notes

- This app uses Electron with a modern dark-theme Arabic RTL interface.
- The FFmpeg process is launched in the background through Node.js `child_process`.
- The app accepts video files in MP4, MKV, AVI, and MOV formats.
- If the `Loop Video` option is enabled, the stream repeats using `-stream_loop -1`.

## Example FFmpeg command used internally

```bash
ffmpeg -re -stream_loop -1 -i "C:/videos/sample.mp4" -c:v copy -c:a aac -f flv "rtmp://a.rtmp.youtube.com/live2/STREAM_KEY"
```

## Project structure

```text
live-video-streamer/
├── index.html
├── main.js
├── preload.js
├── package.json
├── ffmpeg.exe
└── README.md
```

## Environment

This project is designed for Windows desktop usage, but the code can also work on Linux/macOS if `ffmpeg` is installed and available in the system `PATH`.

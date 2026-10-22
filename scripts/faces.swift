// Face detection for step 3b, using Apple's Vision framework (macOS only).
// Reads image paths from stdin, one per line; prints one JSON object per line:
// {"path": ..., "face": {"x": cx, "y": cy, "h": height} | null}, as fractions of
// the image with the origin at the top left. Picks the largest face.
import Foundation
import Vision

while let path = readLine() {
    var face = "null"
    let request = VNDetectFaceRectanglesRequest()
    let handler = VNImageRequestHandler(url: URL(fileURLWithPath: path), options: [:])
    if (try? handler.perform([request])) != nil,
       let best = request.results?.max(by: { $0.boundingBox.height < $1.boundingBox.height }) {
        let b = best.boundingBox // normalised, origin bottom-left
        face = String(format: "{\"x\":%.4f,\"y\":%.4f,\"h\":%.4f}", b.midX, 1 - b.midY, b.height)
    }
    let escaped = path.replacingOccurrences(of: "\\", with: "\\\\").replacingOccurrences(of: "\"", with: "\\\"")
    print("{\"path\":\"\(escaped)\",\"face\":\(face)}")
    fflush(stdout)
}

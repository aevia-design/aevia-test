# Summary 01-02 — EXIF Reading + Orientation + Variant Picker

## Status: Complete

- exifr loaded via CDN
- File input wired: reads EXIF DateTimeOriginal + Orientation tag
- Orientation fallback: image natural dimensions (height > width = vertical; square = horizontal)
- Chronological sort; if no EXIF dates found → keep upload order + show warning banner
- Variant picker: L1/L2 from photo[0] orientation; R1/R2/R3 from photo[1]+photo[2] orientations
- Edge cases handled: <3 photos shows error; no EXIF dates shows reorder warning

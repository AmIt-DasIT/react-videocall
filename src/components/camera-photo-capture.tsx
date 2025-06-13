import { useState, useRef } from "react";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { CameraIcon, CameraOffIcon, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CameraPhotoCaptureProps {
  className?: string;
}

interface Photo {
  id: string;
  dataUrl: string;
}

export const CameraPhotoCapture: React.FC<CameraPhotoCaptureProps> = ({
  className,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMirrored, setIsMirrored] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [aspectRatio, setAspectRatio] = useState<number>(4 / 3);
  const isMountedRef = useRef(true);
  const touchDistanceRef = useRef<number | null>(null);

  const aspectRatioOptions = [
    { label: "4:3", value: 4 / 3 },
    { label: "16:9", value: 16 / 9 },
    { label: "1:1", value: 1 },
  ];

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          aspectRatio: aspectRatio,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      if (!isMountedRef.current) {
        mediaStream.getTracks().forEach((track) => track.stop());
        return;
      }

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;

        await new Promise<void>((resolve) => {
          if (videoRef.current) {
            videoRef.current.addEventListener(
              "loadedmetadata",
              () => resolve(),
              { once: true }
            );
          } else {
            resolve();
          }
        });

        if (videoRef.current && isMountedRef.current) {
          await videoRef.current.play().catch((err) => {
            if (
              err.name === "AbortError" ||
              err.message.includes("interrupted") ||
              err.message.includes("media was removed from the document")
            ) {
              console.warn("Suppressed video play error:", err.message);
              return;
            }
            throw err;
          });
        }
      }
    } catch (err) {
      if (isMountedRef.current) {
        const errorMessage = `Failed to access camera: ${
          (err as Error).message
        }`;
        setError(errorMessage);
        toast.error(errorMessage);
      }
    }
  };

  const handleStopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
    setError(null);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current || !isMountedRef.current)
      return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) {
      setError("Failed to get canvas context");
      toast.error("Failed to get canvas context");
      return;
    }

    // Set canvas dimensions to maintain aspect ratio
    const targetWidth = video.videoWidth;
    const targetHeight = Math.round(targetWidth / aspectRatio);
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    // Calculate source dimensions to maintain aspect ratio
    const sourceWidth = video.videoWidth;
    const sourceHeight = Math.round(sourceWidth / aspectRatio);
    const sourceY = (video.videoHeight - sourceHeight) / 2;

    // Apply mirror effect if enabled
    if (isMirrored) {
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
    }

    // Draw the current video frame to the canvas
    context.drawImage(
      video,
      0,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      canvas.width,
      canvas.height
    );

    // Reset transformations
    context.setTransform(1, 0, 0, 1, 0, 0);

    // Get the image data as a data URL
    const imageData = canvas.toDataURL("image/png");
    setPhotos((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        dataUrl: imageData,
      },
    ]);
  };

  const clearPhoto = (id: string) => {
    if (isMountedRef.current) {
      setPhotos((prev) => prev.filter((photo) => photo.id !== id));
    }
  };

  const clearAllPhotos = () => {
    if (isMountedRef.current) {
      setPhotos([]);
    }
  };

  const toggleMirror = () => {
    setIsMirrored((prev) => !prev);
  };

  const handleZoomChange = (value: number[]) => {
    const newZoom = value[0];
    setZoomLevel(newZoom);
    if (videoRef.current) {
      videoRef.current.style.transform = `scale(${newZoom}) ${
        isMirrored ? "scaleX(-1)" : ""
      }`;
      videoRef.current.style.transition = "transform 0.1s ease-out";
    }
  };

  // Handle pinch-to-zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch1.clientX - touch2.clientX,
        touch1.clientY - touch2.clientY
      );
      touchDistanceRef.current = distance;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchDistanceRef.current !== null) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const newDistance = Math.hypot(
        touch1.clientX - touch2.clientX,
        touch1.clientY - touch2.clientY
      );
      const zoomChange = newDistance / touchDistanceRef.current;
      const newZoom = Math.min(Math.max(zoomLevel * zoomChange, 1), 5);
      setZoomLevel(newZoom);
      if (videoRef.current) {
        videoRef.current.style.transform = `scale(${newZoom}) ${
          isMirrored ? "scaleX(-1)" : ""
        }`;
      }
      touchDistanceRef.current = newDistance;
    }
  };

  const handleTouchEnd = () => {
    touchDistanceRef.current = null;
  };

  if (error) {
    return (
      <div
        className={`bg-gray-800 flex items-center justify-center p-4 rounded-lg ${className}`}
      >
        <p className="text-red-500 text-center">{error}</p>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center space-y-4 p-4 min-h-screen w-full max-w-4xl mx-auto ${className}`}
    >
      <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
        <Button
          onClick={() => (stream ? handleStopCamera() : startCamera())}
          className="w-full sm:w-auto touch-manipulation"
        >
          {stream ? (
            <CameraOffIcon className="h-8 w-8" />
          ) : (
            <CameraIcon className="h-8 w-8" />
          )}
        </Button>
        <Select
          onValueChange={(value) => setAspectRatio(parseFloat(value))}
          defaultValue={aspectRatio.toString()}
        >
          <SelectTrigger className="w-full sm:w-[180px] touch-manipulation">
            <SelectValue placeholder="Select aspect ratio" />
          </SelectTrigger>
          <SelectContent>
            {aspectRatioOptions.map((option) => (
              <SelectItem key={option.label} value={option.value.toString()}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-3xl bg-black"
        style={{ aspectRatio: aspectRatio }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
          style={{
            transform: `${isMirrored ? "scaleX(-1)" : ""}`,
            transformOrigin: "center",
          }}
        />
        {stream && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full px-4 sm:w-auto">
            <Button onClick={capturePhoto}>Capture Photo</Button>
            <Button
              onClick={toggleMirror}
              variant={isMirrored ? "destructive" : "secondary"}
            >
              {isMirrored ? "Unmirror" : "Mirror"}
            </Button>
          </div>
        )}
      </div>

      {stream && (
        <div className="w-full max-w-md px-4">
          <label
            htmlFor="zoom"
            className="text-white mb-2 block text-center sm:text-left"
          >
            Zoom: {zoomLevel.toFixed(1)}x
          </label>
          <Slider
            id="zoom"
            min={1}
            max={5}
            step={0.1}
            value={[zoomLevel]}
            onValueChange={handleZoomChange}
            className="touch-manipulation h-8"
          />
        </div>
      )}

      {photos.length > 0 && (
        <div className="w-full px-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white text-lg">
              Captured Photos ({photos.length})
            </h3>
            <Button onClick={clearAllPhotos} className="touch-manipulation">
              Clear All
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="relative"
                style={{ aspectRatio: aspectRatio }}
              >
                <img
                  src={photo.dataUrl}
                  alt="Captured photo"
                  className="w-full h-full object-cover rounded-lg"
                />
                <Button
                  variant={"destructive"}
                  onClick={() => clearPhoto(photo.id)}
                  className="absolute top-1 right-1 font-semibold p-2 touch-manipulation"
                >
                  <X />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

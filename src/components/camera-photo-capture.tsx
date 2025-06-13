import { useState, useRef } from "react";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { CameraIcon, CameraOffIcon, X } from "lucide-react";

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
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMirrored, setIsMirrored] = useState<boolean>(true); // Default to mirrored
  const [zoomLevel, setZoomLevel] = useState<number>(1); // Default zoom level (1x)
  const isMountedRef = useRef(true);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
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
      console.log("Stopping camera stream");
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      console.log("Pausing and clearing video element");
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

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Apply mirror effect if enabled
    if (isMirrored) {
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
    }

    // Draw the current video frame to the canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

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

  const handleZoomChange = (value: any) => {
    const newZoom = parseFloat(value);
    setZoomLevel(newZoom);
    if (videoRef.current) {
      videoRef.current.style.transform = `scale(${newZoom}) ${
        isMirrored ? "scaleX(-1)" : ""
      }`;
    }
  };

  if (error) {
    return (
      <div
        className={`bg-gray-800 flex items-center justify-center p-4 rounded-lg ${className}`}
      >
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center space-y-4 p-4 min-h-screen rounded-lg ${className}`}
    >
      <Button onClick={() => (stream ? handleStopCamera() : startCamera())}>
        {stream ? (
          <CameraOffIcon className="h-8 w-8" />
        ) : (
          <CameraIcon className="h-8 w-8" />
        )}
      </Button>
      <div className="relative max-w-full overflow-hidden rounded-3xl">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-fit min-h-[80vh]"
          style={{
            transform: `${isMirrored ? "scaleX(-1)" : ""}`,
            transformOrigin: "center",
          }}
        />
        {stream && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
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
        <div className="w-full max-w-md">
          <label htmlFor="zoom" className="text-white mb-2 block">
            Zoom: {zoomLevel.toFixed(1)}x
          </label>

          <Slider
            id="zoom"
            min={1}
            max={3}
            step={0.1}
            value={[zoomLevel]}
            onValueChange={handleZoomChange}
          />
        </div>
      )}

      {photos.length > 0 && (
        <div className="w-full max-w-7xl">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-white text-lg">
              Captured Photos ({photos.length})
            </h3>
            <Button onClick={clearAllPhotos}>Clear All</Button>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {photos.map((photo) => (
              <div key={photo.id} className="relative">
                <img
                  src={photo.dataUrl}
                  alt="Captured photo"
                  className="w-full rounded-lg"
                />
                <Button
                  variant={"destructive"}
                  onClick={() => clearPhoto(photo.id)}
                  className="absolute top-1 right-1 font-semibold py-0.5 px-1"
                >
                  <X onClick={() => clearPhoto(photo.id)} />
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

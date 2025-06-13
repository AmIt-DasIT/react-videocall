import { Toaster } from "sonner";
import { CameraPhotoCapture } from "./components/camera-photo-capture";
import { ModeToggle } from "./components/mode-toggle";

function App() {
  return (
    <div className="min-h-screen">
      <ModeToggle />
      <CameraPhotoCapture />
      <Toaster />
    </div>
  );
}

export default App;

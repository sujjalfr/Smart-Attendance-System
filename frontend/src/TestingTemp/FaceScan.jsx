import React, { useRef, useState } from "react";
import Webcam from "react-webcam";

const FaceScan = () => {
  const webcamRef = useRef(null);
  const [imgSrc, setImgSrc] = useState(null);

  const capture = () => {
    const imageSrc = webcamRef.current.getScreenshot();
    setImgSrc(imageSrc);
    // You can now send imageSrc (base64) to your backend API
  };

  return (
    <div>
      <h2>Face Scan</h2>
      <Webcam
        audio={false}
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        width={320}
        height={240}
      />
      <br />
      <button onClick={capture}>Capture</button>
      {imgSrc && (
        <div>
          <h3>Preview:</h3>
          <img src={imgSrc} alt="Captured" />
        </div>
      )}
    </div>
  );
};

export default FaceScan;
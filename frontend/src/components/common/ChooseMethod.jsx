import React from "react";

const ChooseMethod = ({ onChoose }) => (
  <div className="flex flex-col items-center">
    <h2 className="text-lg font-semibold mb-4">Choose Roll No Input Method</h2>
    <button
      className="btn btn-primary mb-2 w-full"
      onClick={() => onChoose("face")}
    >
      Scan Face
    </button>
    <button
      className="btn btn-secondary w-full"
      onClick={() => onChoose("manual")}
    >
      Enter Roll No Manually
    </button>
  </div>
);

export default ChooseMethod;

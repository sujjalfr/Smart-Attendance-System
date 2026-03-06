import React from "react";

const AttendanceResult = ({ result, onStartOver, onRescanFace, onReenterRoll }) => (
  <div className="text-center" >
    {result.success ? (
      <>
        <h3 className="text-green-600 text-xl font-bold" >Face Scan Success</h3>
        <p>Name: {result.name}</p>
        <p>Roll No: {result.rollNo}</p>
        <button onClick={onStartOver} className="btn btn-primary mt-2">Start Over</button>
      </>
    ) : (
      <>
        <h3 className="text-red-600 text-xl font-bold">Face Scan Failed</h3>
        <p>{result.error}</p>
        <button onClick={onRescanFace} className="btn btn-primary mt-2 pl-4">Rescan Face</button>
        <button onClick={onReenterRoll} className="btn btn-secondary mt-2 pl-4">Re-enter Roll No</button>
      </>
    )}
  </div>
);

export default AttendanceResult;

import React, { useState } from "react";

const ManualRollInput = ({ onSubmit }) => {
  const [input, setInput] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim()) {
      onSubmit(input.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col items-center">
      <h2 className="mb-2">Enter Roll No</h2>
      <input
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="Roll No"
        className="input input-bordered my-2 w-full"
        required
      />
      <button type="submit" className="btn btn-primary w-full">Submit</button>
    </form>
  );
};

export default ManualRollInput;

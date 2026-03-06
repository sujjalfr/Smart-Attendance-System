export const markAttendance = async (rollNo, imageBlob) => {
  const formData = new FormData();
  formData.append("roll_no", rollNo);
  formData.append("image", imageBlob, "face.jpb");
  const response = await fetch("http://127.0.0.1:8000/attendance/", {
    method: "POST",
    body: formData,
  });
  return response.json();
};
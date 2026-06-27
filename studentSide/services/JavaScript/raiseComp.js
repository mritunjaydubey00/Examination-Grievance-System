const submitButton = document.getElementById("submit-button");
function manageSubmit() {
  const currentUserEmail = document.getElementById("currentUser-email").value;
  const complaintDescription = document.getElementById("complaint-text").value;
  const complaintFile = document.getElementById("report-file").value;
  console.log(currentUserEmail);
  console.log(complaintDescription);
}
submitButton.addEventListener("click", manageSubmit);

function UploadtoDatabase(
  currentUserEmail,
  complaintDescription,
  complaintFile,
) {}

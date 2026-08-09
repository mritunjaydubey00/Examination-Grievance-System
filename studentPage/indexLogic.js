function SaveData(subject, description, exam, problemType) {
  const problemID = Math.floor(Math.random() * 1000000); // Generate a random problem ID
  const grievanceData = {
    problemID: problemID,
    subject: subject,
    description: description,
    exam: exam,
    problemType: problemType,
  };
}

function handleChoice(tagSection, targetID) {
  switch (tagSection) {
    case "exam":
      console.log(tagSection + " choice selected: " + targetID);
      document.getElementById("examDropdown").textContent = targetID;
      break;
    case "type":
      console.log(tagSection + " choice selected: " + targetID);
      document.getElementById("typeDropdown").textContent = targetID;
      break;
  }
}

function handleSubmit() {
  let subject = document.getElementById("grievanceSubject").value;
  let description = document.getElementById("grievanceDescription").value;
  let exam = document.getElementById("examDropdown").textContent;
  let problemType = document.getElementById("typeDropdown").textContent;

  console.log(subject);
  console.log(description);
  console.log("selected exam: " + exam);
  console.log("selected problem type: " + problemType);
}

const majorExamProblemType = {
  '0001': "Absent on exam day",
  '0002': "Problem in the desktop",
  '0003': "Complaint for Misconduct",
  '0004': "Date Clash with another exam",
}

const minorExamProblemType = {
  '0001': "Absent on exam day",
  '0002': "Complaint for Misconduct",
  '0003': "Date Clash with another exam",
  '0004': "Problem in question paper",
  '0005': "Marks Correction Issue",
}
const QuizProblemType = {
  '0001': "Absent on quiz day",
  '0002': "Problem in the desktop",
  '0003': "Complaint for Misconduct",
  '0004': "Date Clash with another exam",
}
const marksheetProblemType = {
  '0001': "Marks Correction Issue",
  '0002': "Data correction in marksheet",
  '0003': "Request for duplicate marksheet",
  '0004': "Request for speedy process of marksheet",
}



function manageTagSelection(grievanceType) { 
  switch (grievanceType) {
    case "1":
      console.log("Major Exam");
      for (const [key, value] of Object.entries(majorExamProblemType)) {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.classList.add("dropdown-item");
        a.href = "#";
        a.textContent = value;
        li.appendChild(a);
        document.getElementById("grievanceTypeDropdown").appendChild(li);
      };
      break;
    case "2":
      console.log("Minor Exam");
      for (const [key, value] of Object.entries(minorExamProblemType)) {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.classList.add("dropdown-item");
        a.href = "#";
        a.textContent = value;
        li.appendChild(a);
        document.getElementById("grievanceTypeDropdown").appendChild(li);
      };
      break;
    case "3":
      console.log("Quiz");
      for (const [key, value] of Object.entries(QuizProblemType)) {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.classList.add("dropdown-item");
        a.href = "#";
        a.textContent = value;
        li.appendChild(a);
        document.getElementById("grievanceTypeDropdown").appendChild(li);
      };
      break;
    
}
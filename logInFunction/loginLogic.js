const userId = "testId@mail.com";
const password = "testPassword";

function authenticateUser(enteredID, enteredPassword) {
  if (enteredID === userId && enteredPassword === password) {
    return true;
  } else {
    return false;
  }
}

function handleLogin(id, password) {
  const userId = document.getElementById("userId").value;
  const userPassword = document.getElementById("userPassword").value;

  console.log("entered ID:", userId);
  console.log("entered Password:", userPassword);

  const isAuthenticated = authenticateUser(userId, userPassword);
  if (isAuthenticated) {
    alert("Login successful!");
    // Redirect to the dashboard or perform other actions
  } else {
    alert("Invalid credentials. Please try again.");
    // Show an error message to the user
  }
}

// Change the id's of Input

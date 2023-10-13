function checkEmail() {
    var email = document.getElementById("email").value;
    var errorContainer = document.getElementById("error-message");
    var createAccountButton = document.getElementById("create-account-button");

    fetch("/check_email", {
        method: "POST",
        body: JSON.stringify({ email: email }),
        headers: {
            "Content-Type": "application/json"
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.exists) {
            errorContainer.style.color = "red";
            errorContainer.textContent = "Email already exists.";
            createAccountButton.disabled = true;
        } else {
            errorContainer.textContent = "";
            createAccountButton.disabled = false;
        }
    })
    .catch(error => console.error("Error:", error));
}
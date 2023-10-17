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

document.addEventListener("DOMContentLoaded", function () {
    const addFolderForm = document.getElementById("addFolderForm");
    const addFolderButton = document.getElementById("addFolderButton");
    const messageDiv = document.getElementById("message");

    addFolderButton.addEventListener("click", function () {
        const folder_name = document.getElementById("folder_name").value;
        console.log(folder_name);
        fetch("/add_folder", {
            method: "POST",
            body: JSON.stringify({  folderName: folder_name  }),
            headers: {
                "Content-Type": "application/json"
            }
        })

        .then(response => response.json())
        .then(data => {
            messageDiv.innerHTML = data.message;
        })
        .catch(error => {
            messageDiv.innerHTML = `Error: ${error}`;
        });
    });
});


document.addEventListener('DOMContentLoaded', function() {
    // When the page is loaded, make a GET request to the /folders route
    fetch('/getFolders', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.folder_names) {
            const folderList = document.getElementById('folder-list');
            data.folder_names.forEach(folderName => {
                const listItem = document.createElement('li');
                listItem.textContent = folderName;
                folderList.appendChild(listItem);
            });
        } else {
            console.error('Error: ' + data.error);
        }
    })
    .catch(error => {
        console.error('Error: ' + error);
    });
});

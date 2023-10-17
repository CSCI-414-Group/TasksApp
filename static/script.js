function checkEmail() {
    var email = document.getElementById("email").value;
    var errorContainer = document.getElementById("error-message");
    var createAccountButton = document.getElementById("create-account-button");

    fetch("/checkEmail", {
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

document.addEventListener('DOMContentLoaded', function () {
    const addFolderForm = document.getElementById('addFolderForm');
    const addFolderButton = document.getElementById('addFolderButton');
    const messageDiv = document.getElementById('message');

    // Define the refreshFolderList function in the outer scope
    function refreshFolderList() {
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
                    folderList.innerHTML = ''; // Clear the existing list
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
    }

    // Add Folder button click event
    addFolderButton.addEventListener('click', function () {
        const folder_name = document.getElementById('folder_name').value;
        console.log(folder_name);
        fetch('/addFolder', {
            method: 'POST',
            body: JSON.stringify({ folderName: folder_name }),
            headers: {
                'Content-Type': 'application/json'
            }
        })
            .then(response => response.json())
            .then(data => {
                messageDiv.innerHTML = data.message;
                refreshFolderList(); // Call the refreshFolderList function
            })
            .catch(error => {
                messageDiv.innerHTML = `Error: ${error}`;
            });
    });

    // Initial folder list retrieval
    refreshFolderList();
});

document.addEventListener('DOMContentLoaded', function () {
    const addTaskButton = document.getElementById('addTaskButton');
    const messageDiv = document.getElementById('message2');

    addTaskButton.addEventListener('click', function () {
        const folderName = document.getElementById('folder_names').value;
        const taskName = document.getElementById('task_name').value;
        const taskStatus = document.getElementById('task_status').value;

        const requestData = {
            folder_name: folderName,
            task_name: taskName,
            task_status: taskStatus
        };

        fetch('/addTaskToFolder', {
            method: 'POST',
            body: JSON.stringify(requestData),
            headers: {
                'Content-Type': 'application/json'
            }
           
        })
        .then(response => response.json())
        .then(data => {
            messageDiv.textContent = data.message;
            // You can also refresh the folder list or perform other actions here.
        })
        .catch(error => {
            messageDiv.innerHTML = `Error: ${error}`;
        });
    });
});

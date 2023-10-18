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
                        const removeButton = createRemoveButton(folderName); // Call createRemoveButton
                        listItem.appendChild(removeButton); // Add the remove button to the list item              
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

    // Remove Folder button click event
    function createRemoveButton(folderName) {
        const removeButton = document.createElement('button');
        removeButton.textContent = 'Remove';
        removeButton.addEventListener('click', function () {
          if (confirm(`Are you sure you want to remove folder: ${folderName}?`)) {
            fetch('/removeFolder', {
              method: 'POST',
              body: JSON.stringify({ folderName: folderName }),
              headers: {
                'Content-Type': 'application/json'
              }
            })
              .then(response => response.json())
              .then(data => {
                if (data.success) {
                  refreshFolderList(); // Call the refreshFolderList function
                } else {
                  console.error('Error: ' + data.error);
                }
              })
              .catch(error => {
                console.error('Error: ' + error);
              });
          }
        });
        return removeButton;
      }

    // Initial folder list retrieval
    refreshFolderList();
});


document.addEventListener("DOMContentLoaded", function () {
    // Get a reference to the folder list and task list elements
    const folderList = document.getElementById('folder-list');
    const taskList = document.getElementById('task-list');

    // Add a click event listener to the folder list
    folderList.addEventListener("click", function (event) {
        const target = event.target;
        if (target.tagName === 'LI') {
            const folderName = target.textContent.replace('Remove', '');
            console.log(folderName);
            // Make an AJAX request to your Python route
            fetch(`/getFolderTask?folder_name=${folderName}`)
                .then(response => response.json())
                .then(data => {
                    if (data.error) {
                        alert(data.error);
                    } else {
                        // Display tasks in the task list
                        taskList.innerHTML = ''; // Clear previous tasks
                        data.folders.forEach(task => {
                            const taskItem = document.createElement('div');
                            taskItem.innerHTML = `Title: ${task.name}<br>Status: ${task.status}`;
                            if (task.imageFileName && task.imageFileData) {
                                const downloadLink = document.createElement('a');
                                downloadLink.href = `data:image/png;base64,${task.imageFileData}`;
                                downloadLink.download = task.imageFileName;
                                downloadLink.textContent = `${task.imageFileName}`;
                                taskItem.appendChild(downloadLink);
                            }
                            taskList.appendChild(taskItem);
                        });
                    }
                })
                .catch(error => {
                    console.error(error);
                });
        }
    });
});



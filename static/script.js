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
    var folderNameFromClick = "";
    
    // Function to create an edit button for a task
    function createEditButton() {
        const editButton = document.createElement('button');
        editButton.textContent = 'Edit';
        editButton.classList.add('edit-task-button');
        editButton.addEventListener('click', handleTaskEditClick);
        return editButton;
    }

    // Add a click event listener to the folder list
    folderList.addEventListener("click", function (event) {
        const target = event.target;
        if (target.tagName === 'LI') {
            const folderName = target.textContent.replace('Remove', '');
            folderNameFromClick=folderName
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
                            // Add an edit button for each task
                            const editButton = createEditButton();
                            taskItem.appendChild(editButton);
                            taskList.appendChild(taskItem);
                        });
                    }
                })
                .catch(error => {
                    console.error(error);
                });
        }
    });
    
    function handleTaskEditClick(event) {
        const taskItem = event.target.parentElement;
        const taskItemText = taskItem.textContent;
    
        const titleMatch = /Title: (.*?)Status:/.exec(taskItemText);
        const statusMatch = /Status: (.*)/.exec(taskItemText);

        if (titleMatch && statusMatch) {
            const oldTaskName = titleMatch[1].trim();
            const oldTaskStatus = statusMatch[1].trim();

            const newTaskName = prompt('Enter the new task name:', oldTaskName);
            const newTaskStatus = prompt('Enter the new task status:', oldTaskStatus);
        }

        fetch('/updateTask', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                folderName: folderNameFromClick,
                oldTaskName: oldTaskName,
                newTaskName: newTaskName,
                newTaskStatus: newTaskStatus
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Task edited successfully!');
                // You can implement additional logic here, such as updating the UI to reflect the changes.
            } else {
                alert('Failed to edit task. Please check your input and try again.');
            }
        })
        .catch(error => {
            console.error('Error editing task:', error);
            alert('An error occurred while editing the task. Please try again later.');
        });
    
    }

});




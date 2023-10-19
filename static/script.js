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


    function createEditButton() {
        const editButton = document.createElement('button');
        editButton.textContent = 'Edit';
        editButton.classList.add('edit-button');
        return editButton;
    }
    
    taskList.addEventListener("click", function (event) {
        const target = event.target;
    
        if (target.classList.contains("edit-button")) {
            // Handle the "Edit" button click event
            const taskItem = target.closest("div");
            const folderName = folderNameFromClick; // You can get the folder name from your existing logic
    
            // Extract the task title and status from the data attributes
            const title = taskItem.getAttribute("data-title");
            const status = taskItem.getAttribute("data-status");
    
            console.log(`Edit button clicked for folder: ${folderName}`);
            console.log(`Task Title: ${title}`);
            console.log(`Task Status: ${status}`);
    
            // You can now implement your code for editing the task here.
            // You might want to display an edit form or take other actions as needed.
        }
    });
    
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
                            taskItem.innerHTML = `
                            <div data-title="${task.name}" data-status="${task.status}">
                                Title: ${task.name}<br>Status: ${task.status}
                                ${
                                    task.imageFileName && task.imageFileData
                                        ? `
                                            <a href="data:image/png;base64,${task.imageFileData}" download="${task.imageFileName}">
                                                ${task.imageFileName}
                                            </a>
                                        `
                                        : ''
                                }
                                ${createEditButton().outerHTML}
                            </div>
                        `;

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

// script.js starts here for editing////////////

document.addEventListener('DOMContentLoaded', function() {
    const taskListContainer = document.getElementById('task-list');
    var folderName;

    // Enable edit buttons for existing tasks and newly added tasks
    function enableEditButtons() {
        const editTaskButtons = document.querySelectorAll('.edit-task-button');
        editTaskButtons.forEach(button => {
            button.addEventListener('click', handleTaskEditClick);
        });
    }

    // Function to fetch tasks for a specific folder and display them in the UI
    function fetchTasksForFolder(folderName) {
        fetch(`/getFolderTask?folder_name=${folderName}`)
            .then(response => response.json())
            .then(data => {
                displayTasks(data.folders);
            })
            .catch(error => {
                console.error('Error fetching tasks:', error);
                alert('An error occurred while fetching tasks. Please try again later.');
            });
    }

    // Function to display tasks in the UI
    function displayTasks(tasks) {
        taskListContainer.innerHTML = ''; // Clear existing tasks from the UI

        tasks.forEach(task => {
            const taskItem = document.createElement('div');
            taskItem.className = 'task-item';
            taskItem.innerHTML = `
                <span class="task-name">${task.name}</span>
                <span class="task-status">${task.status}</span>
                <button class="edit-task-button">Edit</button>
            `;
            taskListContainer.appendChild(taskItem);
        });

        enableEditButtons(); // Enable edit buttons for newly displayed tasks
    }

    // Function to handle the click event of the Edit button
    function handleTaskEditClick(event) {
        const taskItem = event.target.parentElement;
        const taskNameElement = taskItem.querySelector('.task-name');
        const taskStatusElement = taskItem.querySelector('.task-status');
    
        const oldTaskName = taskNameElement.textContent;
        const oldTaskStatus = taskStatusElement.textContent;

        const newTaskName = prompt('Enter the new task name:', oldTaskName);
        const newTaskStatus = prompt('Enter the new task status:', oldTaskStatus);

        // Check if user clicked 'Cancel' in the prompt
        if (newTaskName !== null && newTaskStatus !== null) {
            fetch('/updateTask', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    folderName: folderName,  // Pass the folder name from your logic
                    oldTaskName: oldTaskName,
                    newTaskName: newTaskName,
                    newTaskStatus: newTaskStatus
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Update the UI to reflect the changes
                    taskNameElement.textContent = newTaskName;
                    taskStatusElement.textContent = newTaskStatus;
                    alert('Task edited successfully!');
                } else {
                    alert('Failed to edit task. Please check your input and try again.');
                }
            })
            .catch(error => {
                console.error('Error editing task:', error);
                alert('An error occurred while editing the task. Please try again later.');
            });
        } else {
            // User canceled the edit operation
            alert('Task editing canceled.');
        }
    }

    // Assuming you have an "Edit Task" button in your HTML with class "edit-task-button"
    const editTaskButtons = document.querySelectorAll('.edit-task-button');
    editTaskButtons.forEach(button => {
        button.addEventListener('click', function() {
            folderName = prompt('Enter the folder name:');
            if (folderName) {
                fetchTasksForFolder(folderName);
            } else {
                // User canceled the prompt.
                alert('Task editing canceled.');
            }
        });
    });
});


//Removing tasks from a folder starts here

document.addEventListener('DOMContentLoaded', function() {
    const getTasksButton = document.getElementById('get-tasks-button');
    const taskListContainer = document.getElementById('task-list');
    let folderName; // Define folderName variable in the outer scope

    getTasksButton.addEventListener('click', function() {
        folderName = document.getElementById('delete-folder-name').value; // Update folderName variable
        if (folderName) {
            fetchTasksForFolder(folderName);
        } else {
            alert('Please enter a folder name.');
        }
    });

    function fetchTasksForFolder(folderName) {
        // Make a request to fetch tasks for the specified folder
        fetch(`/getFolderTask?folder_name=${folderName}`)
            .then(response => response.json())
            .then(data => {
                displayTasks(data.folders);
            })
            .catch(error => {
                console.error('Error fetching tasks:', error);
                alert('An error occurred while fetching tasks. Please try again later.');
            });
    }

    function displayTasks(tasks) {
        // Clear existing tasks from the UI
        taskListContainer.innerHTML = '';

        // Display tasks in the UI
        tasks.forEach(task => {
            const taskItem = document.createElement('li');
            taskItem.textContent = `Task: ${task.name}, Status: ${task.status}`;
            taskItem.dataset.taskName = task.name; // Store task name as a data attribute
            const deleteButton = createDeleteButton(folderName, task.name);
            taskItem.appendChild(deleteButton);
            taskListContainer.appendChild(taskItem);
        });
    }

    function createDeleteButton(folderName, taskName) {
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete Task';
        deleteButton.addEventListener('click', function() {
            if (confirm(`Are you sure you want to delete task: ${taskName}?`)) {
                // Call the deleteTask function with folderName and taskName
                deleteTask(folderName, taskName);
            }
        });
        return deleteButton;
    }

    function deleteTask(folderName, taskName) {
        fetch('/removeTask', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                folderName: folderName,
                taskName: taskName
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                alert('Task deleted successfully!');
                // Find the task item using the data attribute and remove it
                const taskItemToRemove = document.querySelector(`li[data-taskName="${taskName}"]`);
                if (taskItemToRemove) {
                    taskItemToRemove.remove();
                }
            } else {
                alert('Failed to delete task. Please try again.');
            }
        })
        .catch(error => {
            console.error('Error deleting task:', error);
            alert('An error occurred while deleting the task. Please try again later.');
        });
    }
});


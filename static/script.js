function toggleDarkMode() {
    const lightModeStylesheet = document.getElementById("light-mode-stylesheet");
    const darkModeStylesheet = document.getElementById("dark-mode-stylesheet");

    if (lightModeStylesheet.disabled) {
        lightModeStylesheet.disabled = false;
        darkModeStylesheet.disabled = true;
    } else {
        lightModeStylesheet.disabled = true;
        darkModeStylesheet.disabled = false;
    }
}

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



async function addTaskToServer(taskName, status, folderName, binaryData, imageFile) {
    var fileName;
    if (!imageFile) {
        fileName = null;
    } else {
        fileName = imageFile.name;
    }
    const response = await fetch('/addTaskToFolder', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            folderName: folderName,
            taskName: taskName,
            status: status,
            imageData: binaryData,
            fileName: fileName,
        }),
    });

    const result = await response.json();
    if (result.success) {
        alert('Task added successfully!');
        const taskStatus = result.updated_data.status;
        addTaskToColumn(taskName, taskStatus);
    } else {
        alert('Failed to add the task. Please check your input and try again.');
    }
}

function addTaskToColumn(taskName, taskStatus) {
    const taskItem = document.createElement('li');
    taskItem.textContent = taskName;

    if (taskStatus === 'Pending') {
        document.getElementById('pending-tasks').appendChild(taskItem);
    } else if (taskStatus === 'In Progress') {
        document.getElementById('in-progress-tasks').appendChild(taskItem);
    } else if (taskStatus === 'Completed') {
        document.getElementById('completed-tasks').appendChild(taskItem);
    }
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

//get folder list when clicked and attach edit button and remove buttons to it
document.addEventListener("DOMContentLoaded", function () {
    // Get a reference to the folder list and task list elements
    const folderList = document.getElementById('folder-list');
    const taskList = document.getElementById('task-list');
    var folderNameFromClick = "";

    function createDeleteButton(taskName, taskItem) {
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete Task';
        deleteButton.classList.add('delete-button');
        deleteButton.addEventListener('click', function (event) {
            if (confirm(`Are you sure you want to delete task: ${taskName}?`)) {
                // Call the deleteTask function with folderName and taskName
                deleteTask(folderNameFromClick, taskName, taskItem);
            }
        });
        taskItem.appendChild(deleteButton);
    }

    function deleteTask(folderName, taskName, taskItem) {
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
                if (data.error) {
                    alert('Failed to delete task. Please try again.');


                } else {
                    taskItem.remove();
                }
            })
            .catch(error => {
                console.error('Error deleting task:', error);
                alert('An error occurred while deleting the task. Please try again later.');
            });
    }

    function createEditButton(taskItem) {
        const editButton = document.createElement('button');
        editButton.textContent = 'Edit';
        editButton.classList.add('edit-button');

        editButton.addEventListener("click", function (event) {
            const taskItem = event.target.parentElement;
            const taskNameElement = taskItem.getAttribute('data-title');
            const taskStatusElement = taskItem.getAttribute('data-status');

            const oldTaskName = taskNameElement;
            const oldTaskStatus = taskStatusElement;

            const newTaskName = prompt('Enter the new task name:', oldTaskName);
            const newTaskStatus = prompt('Enter the new task status:', oldTaskStatus);

            const modal = document.getElementById('custom-modal');
            modal.style.display = 'block';

            const uploadButton = document.getElementById('upload-button');
            const cancelButton = document.getElementById('cancel-button');
            const imageUploadInput = document.getElementById('image-upload-input');
            uploadButton.onclick = function () {
                const file = imageUploadInput.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function (e) {
                        const newImage = e.target.result; // Base64 encoded image data
                        updateTaskOnServer(taskItem, oldTaskName, newTaskName, newTaskStatus, file.name, newImage, taskNameElement, taskStatusElement);
                    };
                    reader.readAsDataURL(file);
                }
                else {
                    updateTaskOnServer(taskItem, oldTaskName, newTaskName, newTaskStatus, null, null, taskNameElement, taskStatusElement);
                }
                modal.style.display = 'none';
            };

            cancelButton.onclick = function () {
                modal.style.display = 'none';
                updateTaskOnServer(taskItem, oldTaskName, newTaskName, newTaskStatus, null, null, taskNameElement, taskStatusElement);
            };

        });

        taskItem.appendChild(editButton);
    }

    function updateTaskOnServer(taskItem, oldTaskName, newTaskName, newTaskStatus, fileName, newImage, taskNameElement, taskStatusElement) {
        console.log("image name:" + fileName);
        console.log("image data:" + newImage);
        fetch('/update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                folderName: folderNameFromClick,
                oldTaskName: oldTaskName,
                newTaskName: newTaskName,
                newTaskStatus: newTaskStatus,
                newImage: newImage,
                fileName: fileName
            })
        })
            .then(response => response.json())
            .then(result => {
                if (result.error) {
                    alert('Failed to edit task. Please check your input and try again.');
                } else {
                    // Update the UI to reflect the changes
                    const newTaskDocument = result.updated_data;
                    console.log('Task updated:', newTaskDocument);
                    const newTaskName = newTaskDocument.name;
                    const newTaskStatus = selectedStatus;
                    const newTaskStatusString = newTaskStatus;
                    console.log('Task status:', newTaskStatus);
                    console.log('Task status test:', result.updated_data.status);

                    const newImage = newTaskDocument.imageFileData;
                    const fileName = newTaskDocument.imageFileName;
                    taskItem.setAttribute('data-title', newTaskName);
                    taskItem.setAttribute('data-status', newTaskStatus);
                    taskItem.innerHTML = `
                    <div>
                        Title: ${task.name}<br>Status: ${task.status}
                        ${task.imageFileName && task.imageFileData
                        ? `
                            <a href="${task.imageFileData}" download="${task.imageFileName}">
                                ${task.imageFileName}
                            </a>
                        `
                        : ''
                    }
                    </div>
                `;
                    taskList.appendChild(taskItem);
                    createEditButton(taskItem);
                    createDeleteButton(newTaskName, taskItem);
                    alert('Task edited successfully!');
                }
            })
            .catch(error => {
                console.error('Error editing task:', error);
                alert('An error occurred while editing the task. Please try again later.');
            });
    }



    // Add a click event listener to the folder list
    folderList.addEventListener("click", function (event) {
        const target = event.target;
        if (target.tagName === 'LI') {
            const folderName = target.textContent.replace('Remove', '');
            folderNameFromClick = folderName
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
                        document.getElementById('pending-tasks').innerHTML = '';
                        document.getElementById('in-progress-tasks').innerHTML = '';
                        document.getElementById('completed-tasks').innerHTML = '';
                        data.folders.forEach(task => {
                            const taskItem = document.createElement('div');
                            taskItem.setAttribute('data-title', task.name); // Add data-title attribute
                            taskItem.setAttribute('data-status', task.status);
                        
                            // Create a function to determine the correct column based on the task status
                            function getColumn(status) {
                                switch (status) {
                                    case "Pending":
                                        return document.getElementById('pending-tasks');
                                    case "In Progress":
                                        return document.getElementById('in-progress-tasks');
                                    case "Completed":
                                        return document.getElementById('completed-tasks');
                                    default:
                                        return null;
                                }
                            }
                        
                            // Get the appropriate column and append the task item
                            const column = getColumn(task.status);
                            if (column) {
                                column.appendChild(taskItem);
                            }
                        
                            // Create a container for the task details
                            const taskDetails = document.createElement('div');
                        
                            // Create the task details HTML based on whether the file is defined
                            let taskDetailsHTML = `<p>Title: ${task.name}</p>`;
                        
                            if (task.imageFileData) {
                                // Include the image with a downloadable link
                                taskDetailsHTML += `
                                    <p>Image: <a href="data:image/png;base64,${task.imageFileData}" download="${task.imageFileName}">
                                        <img alt="${task.imageFileName}" />
                                    </a>`;
                            }
                        
                            // Add task details to the container
                            taskDetails.innerHTML = taskDetailsHTML;
                        
                            // Append the task details container to the task item
                            taskItem.appendChild(taskDetails);


                            // Append the task details container to the task item
                            taskItem.appendChild(taskDetails);
                        
                            createEditButton(taskItem);
                            createDeleteButton(task.name, taskItem);
                        });
                    }
                })
                .catch(error => {
                    console.error(error);
                });
        }
    });




    const taskPopup = document.getElementById('taskPopup');
    const addTaskButton = document.getElementById('addTaskButton');
    const closePopup = document.getElementById('closePopup');
    const addTaskToFolderButton = document.getElementById('addTaskToFolder');
    const selectedStatusElement = document.getElementById('taskStatus');
    const newTaskStatus = selectedStatusElement.value; // Use .value to get the selected status as a string



    addTaskButton.addEventListener('click', function () {
        // Set the selected folder name in the popup
        const selectedFolderName = document.getElementById('selectedFolderName');
        selectedFolderName.textContent = `Folder: ${folderNameFromClick}`;
        taskPopup.style.display = 'block';
    });
    addTaskButton.addEventListener('click', function () {
        taskPopup.style.display = 'block';
    });

    closePopup.addEventListener('click', function () {
        taskPopup.style.display = 'none';
    });

    addTaskToFolderButton.addEventListener('click', async function () {
        const taskName = document.getElementById('taskName').value;
        const taskStatus = document.getElementById('taskStatus');
        const newTaskStatus = taskStatus.options[taskStatus.selectedIndex].value;
        const folderName = folderNameFromClick;
        const taskImage = document.getElementById('taskImage').files[0];
    
        if (taskName && newTaskStatus) {
            const binaryData = taskImage ? await readFileAsBase64(taskImage) : null;
            addTaskToServer(taskName, newTaskStatus, folderName, binaryData, taskImage);
            taskPopup.style.display = 'none';
        } else {
            alert('Please fill in all required fields.');
        }
        
    });

    async function readFileAsBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }


    document.addEventListener('DOMContentLoaded', function () {
        // Get the button element by its ID
        const addButton = document.getElementById('addTask');

        // Add an event listener to the button
        addButton.addEventListener('click', function () {
            // Get values from input fields
            const taskName = document.querySelector('input[name="task_name"]').value;
            const status = document.querySelector('input[name="status"]').value;
            const folderName = document.querySelector('input[name="folder_names"]').value;
            const imageFile = document.querySelector('input[name="image"]').files[0]; // For file input

            if (imageFile) {
                const reader = new FileReader();
                reader.onload = function (event) {
                    const binaryData = event.target.result;
                    addTaskToServer(taskName, status, folderName, binaryData, imageFile);

                }
                reader.readAsDataURL(imageFile);

            }
            else {
                addTaskToServer(taskName, status, folderName, null, null);
            }
        });
    });

});
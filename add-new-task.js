// Requires task.js


$("#AddNewTask-SaveAndStartButton").on('click', function() {
    // Extract information from page
    var title = $("#AddNewTask-Title")[0].value;
    var description = $("#AddNewTask-Description")[0].value;
    var durationNumber = parseFloat($("#AddNewTask-DurationNumber")[0].value);
    var durationMinutes = $("#AddNewTask-DurationMinutes")[0].checked;
    var durationHours = $("#AddNewTask-DurationHours")[0].checked;

    // Calculate the expected duration in minutes
    var estimatedDurationMinutes;
    if (durationMinutes) {
	estimatedDurationMinutes = durationNumber;
    }
    else if (durationHours) {
	estimatedDurationMinutes = durationNumber * 60;
    }

    // Create a new task based on the information provided
    var task = new Task(title,
		        description,
		        estimatedDurationMinutes);

    // Save the task to the database
    task.save().then(function(taskId) {
	// Set the task as the active task and start it
	return activeTask.set(task);
    }).then(function() {
	activeTask.timer.start();
	console.log(JSON.stringify(activeTask));
	// Load the task detail page
	window.location.href = "task-detail.html?taskId="+taskId;
    });

});

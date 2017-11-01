// Requires task.js

/**
 * Get the value of a querystring
 * @param  {String} field The field to get the value of
 * @param  {String} url   The URL to get the value from (optional)
 * @return {String}       The field value
 *
 * source: https://gomakethings.com/how-to-get-the-value-of-a-querystring-with-native-javascript/ 
 */
var getQueryString = function ( field, url ) {
    var href = url ? url : window.location.href;
    var reg = new RegExp( '[?&]' + field + '=([^&#]*)', 'i' );
    var string = reg.exec(href);
    return string ? string[1] : null;
};


$(document).ready(function() {
    // Get the 'taskId' from the query string
    var taskId = parseInt(getQueryString("taskId"));
    console.log("task ID:"+taskId);

    // Get the task from the task database
    task = new Task();
    task.load(taskId).then(function() {
	console.log("Successfully loaded task: "+task.json());
		
	$("#TaskDetail-Title").text(task.title);
	$("#TaskDetail-Description").text(task.description);
	$("#TaskDetail-EstimatedDuration").text(task.getEstimatedDurationText());
    }).catch(function(err) {
	console.log("Failed to load task: "+err);
    });
});


// Database


// Returns a promise that the database will be opened.
function openDb() { 
    return new Promise(
	function(resolve, reject) {
	    console.log("Trying to open database");
	    const DB_VERSION = 2;
	    const DB_NAME = "EvidenceBasedSchedulingData";
	    var openDatabaseRequest = indexedDB.open(DB_NAME, DB_VERSION);

	    openDatabaseRequest.onerror = function(event) {
		console.log("An error occurred when opening the database");
		reject();
	    }

	    openDatabaseRequest.onupgradeneeded = function(event) {
		console.log("Database called onupgradeneeded");

		var db = event.target.result;
		
		switch (event.oldVersion) {
		case 0:
		    console.log("Creating database (version 1)");
		    db.createObjectStore("tasks", { keyPath:"id", autoIncrement:true });
		case 1:
		    console.log("Upgrading database to version 2");
		    db.createObjectStore("dict", { keyPath:"key", autoIncrement:false });
		}
	    }

	    openDatabaseRequest.onsuccess = function(event) {
		console.log("Database successfully opened");
		var db = event.target.result;
		resolve(db);
	    }
	}
    );
}


var dbReady = openDb();


function deleteDb() {
    console.log("Trying to delete database");
    var deleteDatabaseRequest = indexedDB.deleteDatabase(DB_NAME);

    deleteDatabaseRequest.onerror = function(event) {
	console.log("Error while deleting database");
    }

    deleteDatabaseRequest.onsuccess = function(event) {
	console.log("Successfully deleted database");
    }
}


// *************************************


// Requires timer.js

// Task object
function Task(title, description, estimatedDurationMinutes) {
    this.title = title;
    this.description = description;
    this.estimatedDurationMinutes = estimatedDurationMinutes;
}

Task.prototype.json = function() {
    return JSON.stringify(this);
}

// Asyncronously saves the task to the database.  Returns a promise
// giving the task id if resolved, or an error if rejected.
Task.prototype.save = function() {
    // Save task to database
    console.log("Saving task to database");
    var thisTask = this;
    return dbReady.then(function(db) {
	return new Promise(function(resolve, reject) {
	    var transaction = db.transaction(["tasks"], "readwrite");

	    transaction.oncomplete = function(event) {
		console.log("Task saved; transaction complete: "+thisTask.json());
		resolve(thisTask.id);
	    }
	    
	    transaction.onerror = function(event) {
		var err = "Transaction error";
		console.log("Failed to save task");
		reject(err);
	    }
	    
	    var tasksStore = transaction.objectStore("tasks");
	    var addRequest = tasksStore.add(thisTask);

	    addRequest.onsuccess = function(event) {
		thisTask.id = event.target.result;
	    }
	});
    }).catch(function(err) {
	console.log("Failed to save task: "+err);
	return err;
    });
}


// Return a promise
Task.prototype.load = function(taskId) {
    console.log("Loading task from database; taskId: "+taskId);
    var thisTask = this;
    return dbReady.then(function(db) {
	return new Promise(function(resolve, reject) {
	    var transaction = db.transaction(["tasks"], "readonly");

	    transaction.oncomplete = function(event) {
		if (thisTask.title == null) {
		    var err = "Task wasn't found in the database (title is null)";
		    console.log(err);
		    reject(err);
		} else {
		    console.log("Task loaded; transaction complete: "+thisTask.json());
		    resolve();
		}
	    }

	    transaction.onerror = function(event) {
		var err = "Transaction error";
		console.log(err);
		reject(err);
	    }

	    try {
		var tasksStore = transaction.objectStore("tasks");
		console.log("taskId: "+taskId);
		var getRequest = tasksStore.get(taskId);
		getRequest.onsuccess = function(event) {
		    try {
			thisTask.title = this.result.title;
			thisTask.description = this.result.description;
			thisTask.estimatedDurationMinutes = this.result.estimatedDurationMinutes;
		    } catch (exception) {
			console.log("in exception");
			// Most likely caused by this.result being undefined
			thisTask.title = null;
			thisTask.description = null;
			thisTask.estimatedDurationMinutes = null;
			//reject(exception);
		    }
		}
	    }
	    catch(e) {
		console.log(e);
	    }
		
	});
    });
}		       		       

Task.prototype.getEstimatedDurationText = function() {
    if (this.estimatedDurationMinutes >= 60) {
	return (this.estimatedDurationMinutes/60).toFixed(1)+" hours";
    } else if (this.estimatedDurationMinutes >= 5) {
	return this.estimatedDurationMinutes.toFixed()+" minutes";
    } else {
	return this.estimatedDurationMinutes.toFixed(1)+" minutes";
    }
}



// ActiveTask
function ActiveTask(task) {
    this.task = task;
    this.timer = new Timer();
}


var activeTask = new ActiveTask(null);

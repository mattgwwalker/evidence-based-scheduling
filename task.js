// Database
const DB_VERSION = 2;
const DB_NAME = "EvidenceBasedSchedulingData";


// Returns a promise that the database will be opened.
function openDb() { 
    return new Promise(
	function(resolve, reject) {
	    console.log("Trying to open database");
	    var openDatabaseRequest = indexedDB.open(DB_NAME, DB_VERSION);

	    openDatabaseRequest.onerror = function(event) {
		console.log("An error occurred when opening the database");
		reject();
	    };

	    openDatabaseRequest.onupgradeneeded = function(event) {
		console.log("Database called onupgradeneeded");

		var db = event.target.result;
		
		// This switch statement deliberately avoids break statements to allow
		// the database to be upgraded in multiple steps.
		switch (event.oldVersion) {
		case 0:
		    console.log("Creating database (version 1)");
		    db.createObjectStore("tasks", { keyPath:"id", autoIncrement:true });
		case 1:
		    console.log("Upgrading database to version 2");
		    db.createObjectStore("properties", { keyPath:"key", autoIncrement:false });
		}
	    };

	    openDatabaseRequest.onsuccess = function(event) {
		console.log("Database successfully opened");
		var db = event.target.result;

		db.onversionchange = function(event) {
		    console.log("Version change event called; closing database");
		    db.close();
		};
		resolve(db);
	    };
	}
    );
}


var dbReady = openDb();


function deleteDb() {
    return new Promise(
	function (resolve, reject) {
	    console.log("Trying to delete database");
	    var deleteDatabaseRequest = indexedDB.deleteDatabase(DB_NAME);

	    deleteDatabaseRequest.onerror = function(event) {
		var err = "Error while deleting database";
		console.log(err);
		reject(err);
	    };

	    deleteDatabaseRequest.onsuccess = function(event) {
		console.log("Successfully deleted database");
		resolve();
	    };
	}
    );
}


// *************************************

// Task
// Requires timer.js

// Task object
function Task(title, description, estimatedDurationMinutes) {
    this.title = title;
    this.description = description;
    this.estimatedDurationMinutes = estimatedDurationMinutes;
    this.timeSpentSoFar = null;
}

Task.prototype.json = function() {
    return JSON.stringify(this);
};

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
	    };
	    
	    transaction.onerror = function(event) {
		var err = "Transaction error";
		console.log("Failed to save task");
		reject(err);
	    };
	    
	    var tasksStore = transaction.objectStore("tasks");
	    var addRequest = tasksStore.add(thisTask);

	    addRequest.onsuccess = function(event) {
		thisTask.id = event.target.result;
	    };
	});
    }).catch(function(err) {
	console.log("Failed to save task: "+err);
	return err;
    });
};


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
	    };

	    transaction.onerror = function(event) {
		var err = "Transaction error";
		console.log(err);
		reject(err);
	    };

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
		};
	    }
	    catch(e) {
		console.log(e);
	    }
	    
	});
    });
};		       		       

Task.prototype.getEstimatedDurationText = function() {
    if (this.estimatedDurationMinutes >= 60) {
	return (this.estimatedDurationMinutes/60).toFixed(1)+" hours";
    } else if (this.estimatedDurationMinutes >= 5) {
	return this.estimatedDurationMinutes.toFixed()+" minutes";
    } else {
	return this.estimatedDurationMinutes.toFixed(1)+" minutes";
    }
};


// *******************************************************


// ActiveTask
function ActiveTask() {
    this.task = null;
    this.timer = null;
}

ActiveTask.prototype.set = function(task) {
    // If there is a current active task, pause it.
    if (this.task != null) {
	console.log("Pausing current active task");
	this.timer.pause();
    } else {
	console.log("There is no current in-memory active task");
    }
    
    // It's important to consider that the active task could have been
    // changed in another tab.  The copy in the database is the
    // cannonical version.
    //
    // Open a transaction that locks the database while we set the
    // active task.
    console.log("Locking active task in database");
    var thisActiveTask = this;
    return dbReady.then(function(db) {
	return new Promise(function(resolve, reject) {
	    var transaction = db.transaction(["properties","tasks"], "readwrite");
	    var propertiesStore = transaction.objectStore("properties");
	    var getRequestActiveTask = propertiesStore.get("activeTask");
	    getRequestActiveTask.onsuccess = function(event) {
		if (this.result == null) {
		    // We haven't saved an active state yet; just
		    // use the in-memory one.
		    console.log("No active task found in database; use in-memory active task");
		} else {
		    console.log("Active task found in database");
		    // Check that what we have in memory matches what
		    // is in the database.  If not, what we have in
		    // memory must be old and the timer must be
		    // invalid; replace it with result from the
		    // database.
		    var dbActiveTask = this.result.value;
		    console.log("dbActiveTask: "+JSON.stringify(dbActiveTask));
		    if (thisActiveTask.task != null &&
			dbActiveTask.task.id == thisActiveTask.task.id &&
		        dbActiveTask.timer.totalTime == thisActiveTask.timer.totalTime) {
			// What we have in memory matches that in the
			// database.  We don't need to do anything.
			console.log("In-memory active task matches that in database");
		    } else {
			// What we have in memory must be old.  Update
			// the in-memory active task.
			console.log("In-memory active task does not match database");
			thisActiveTask.task = dbActiveTask.task;
			thisActiveTask.timer = new Timer(dbActiveTask.timer);
		    }
		}
		// At this point the in-memory active task and the
		// database are in sync and we have a lock on the
		// database.
		console.log("In-memory active task and database are now in sync and database is locked");

		// Define a function to update the active task in
		// memory and in the database as there are two
		// upcoming paths for this.
		var updateActiveTask = function() {
		    console.log("updating active task.");
		    // Update in memory version
		    thisActiveTask.task = task;
		    thisActiveTask.timer = new Timer();
		    if (thisActiveTask.task.timeSpentSoFar != null) {
			thisActiveTask.timer.totalTime = thisActiveTask.task.timeSpentSoFar;
		    }

		    // Update database version
		    propertiesStore.put({key:"activeTask", value:thisActiveTask});
		};

		// The current active task's timer has already been
		// paused.  If the task exists, write the total time
		// to the tasks store.
		if (thisActiveTask.task != null) {
		    var tasksStore = transaction.objectStore("tasks");
		    var getRequestTask = tasksStore.get(thisActiveTask.task.id);
		    getRequestTask.onsuccess = function(event) {
			if (this.result == null) {
			    // The task wasn't found.  
			    console.log("ERROR Active task ID wasn't found in Tasks store; database is corrupt.");
			    transaction.abort();
			} else {
			    // The task was found.  Write the total
			    // time.  Can't use task.save() as the
			    // lock on the database would be lost.
			    thisActiveTask.task.timeSpentSoFar = thisActiveTask.timer.totalTime;
			    var putRequestTask = tasksStore.put(thisActiveTask.task);
			    putRequestTask.onsuccess = function(event) {
				// Update the active task in memory
				// and in the database.
				updateActiveTask();
			    };
			}
		    };
		} else {
		    // The active task hasn't yet been defined, so
		    // just update the task in memory and in the
		    // database.
		    updateActiveTask();
		}

		transaction.oncomplete = function(event) {
		    console.log("Active Task set; transaction complete: "+JSON.stringify(thisActiveTask));
		    resolve();
		};

		transaction.onerror = function(event) {
		    var err = "Transaction error";
		    console.log(err);
		    reject(err);
		};
	    };

	    
	});
    });
};

var activeTask = new ActiveTask(null);



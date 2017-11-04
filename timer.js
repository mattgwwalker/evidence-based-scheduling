// A timer object
function Timer() {
    this.init();
}

Timer.prototype.States = Object.freeze({READY:"ready",
					RUNNING:"running",
					PAUSED:"paused",
					FINISHED:"finished"});

Timer.prototype.init = function() {
    this.state = this.States.READY;
    this.totalTime = 0;
    this.startTime = null;
};

Timer.prototype.start = function() {
    var now = new Date();
    if (this.state != this.States.READY) {
	return false;
    }
    this.state = this.States.RUNNING;
    this.totalTime = 0;
    this.startTime = now.getTime();
    return true;
};

Timer.prototype.pause = function() {
    var now = new Date();
    if (this.state != this.States.RUNNING) {
	return false;
    }

    this.state = this.States.PAUSED;
    this.totalTime += now.getTime() - this.startTime;
    this.startTime = null;
    return true;
};

Timer.prototype.stop = function() {
    var now = new Date();
    if (this.state != this.States.RUNNING) {
	return false;
    }

    this.state = this.States.FINISHED;
    this.totalTime += now.getTime() - this.startTime;
    this.startTime = null;
    return true;
};

Timer.prototype.resume = function() {
    var now = new Date();
    if (this.state != this.States.PAUSED) {
	return false;
    }

    this.state = this.States.RUNNING;
    this.startTime = now.getTime();
    return true;
};

Timer.prototype.getTime = function() {
    var now = new Date();
    if (this.state == this.States.READY) {
	return this.totalTime;
    }
    else if (this.state == this.States.RUNNING) {
	return this.totalTime + now.getTime() - this.startTime;
    }
    else if (this.state == this.States.PAUSED) {
	return this.totalTime;
    }
    else if (this.state == this.States.FINISHED) {
	return this.totalTime;
    }
    else {
	console.log("Timer is in unknown state");
	return null;
    }
};    


# Copyright 2011-2013 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License"). You
# may not use this file except in compliance with the License. A copy of
# the License is located at
#
#     http://aws.amazon.com/apache2.0/
#
# or in the "license" file accompanying this file. This file is
# distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF
# ANY KIND, either express or implied. See the License for the specific
# language governing permissions and limitations under the License.

#!/usr/bin/env node

var events = require('events');
var emitter = new events.EventEmitter();

var remaining = '';
var interactionSummary = {
	day : '',
	count : 0
};

// escape all control characters so that they are plain text in the output
String.prototype.escape = function() {
	return this.replace('\n', '\\n').replace('\'', '\\\'').replace('\"', '\\"')
			.replace('\&', '\\&').replace('\r', '\\r').replace('\t', '\\t')
			.replace('\b', '\\b').replace('\f', '\\f');
}

// append an array to the this one
Array.prototype.appendArray = function(arr) {
	this.push.apply(this, arr);
}

// data is complete, write it to the required output channel
emitter.on('dataReady', function(o) {
	process.stdout.write(JSON.stringify(o) + '\n');
});

// generate a JSON object from the captured input data, and then generate
// the required output
emitter.on('lineReady',function(data) {
	if (!data || data == '') {
		return;
	}
	
	try {
		obj = JSON.parse(data.split('\t')[1]);
	} catch (err) {
		process.stderr.write('Error Processing Line ' + data + '\n')
		process.stderr.write(err);
		return;
	}

	if (interactionSummary.day == '') {
		interactionSummary.day = obj.key_date;
		interactionSummary.count = 1;
	} else {
		if (obj.key_date != interactionSummary.day) {
			// raise an event that the reduced array is completed
			emitter.emit('dataReady', interactionSummary);
			interactionSummary.day = obj.key_date;
			interactionSummary.count = 1;
		} else {
			interactionSummary.count += 1;
		}
	}
});

// fires on every block of data read from stdin
process.stdin.on('data', function(chunk) {
	var capture = chunk.split('\n');

	for (var i=0;i<capture.length; i++) {
		if (i==0) {
			emitter.emit('lineReady',remaining + capture[i]);
		} else if (i<capture.length-1) {
			emitter.emit('lineReady',capture[i]);
		} else {
			remaining = capture[i];
		}
	}
});

// fires when stdin is completed being read
process.stdin.on('end', function() {
	emitter.emit('dataReady',interactionSummary);
});

// resume STDIN - paused by default
process.stdin.resume();

// set up the encoding for STDIN
process.stdin.setEncoding('utf8');
import PeerNetwork from "/web_modules/p2p-peer.js"

var room = decodeURIComponent(window.location.pathname.substr(1));

if (!room) {
	room = 'xxxxxx'.replace(/[x]/g, () => (Math.random() * 36 | 0).toString(36));
	window.history.replaceState({}, 'Random Room', '/' + room);
}

const canvas = document.getElementById('main-canvas');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const ctx = canvas.getContext('2d');
var color = localStorage.color || '#000000';
var isMouseDown = false;
var prevX, prevY;

var canvasReq = false;
var greatestWidth = canvas.width;
var greatestHeight = canvas.height;

const resizeCanvas = (width, height) => {
	var img;
	img = new Image();
	img.src = canvas.toDataURL('image/png');
	img.onload = () => {
		canvas.width = width;
		canvas.height = height;
		ctx.drawImage(img, 0, 0);
	};
};

window.addEventListener('resize', () => {
	let width = Math.max(greatestWidth, window.innerWidth);
	let height = Math.max(greatestHeight, window.innerHeight);
	resizeCanvas(width, height);
	broadcast('dims', {
		width: canvas.width,
		height: canvas.height
	});
});

var colorPicker = document.getElementById('color-picker');
colorPicker.value = color;
colorPicker.onchange = () => {
	color = this.value;
	localStorage.color = color;
	broadcast('color', color);
};

var down = (event) => {
	var rect = (event.target || event.srcElement).getBoundingClientRect();
	prevX = event.clientX - rect.left;
	prevY = event.clientY - rect.top;
	isMouseDown = true;
	broadcast('down', {
		x: prevX,
		y: prevY
	});
};

var move = (event) => {
	if (!isMouseDown)
		return;
	ctx.strokeStyle = color;
	ctx.beginPath();
	ctx.moveTo(prevX, prevY);
	var rect = (event.target || event.srcElement).getBoundingClientRect();
	prevX = event.clientX - rect.left;
	prevY = event.clientY - rect.top;
	ctx.lineTo(prevX, prevY);
	ctx.stroke();
	broadcast('move', {
		x: prevX,
		y: prevY
	});
};

var up = () => {
	isMouseDown = false;
	broadcast('up');
};

document.addEventListener('mousedown', down);
document.addEventListener('touchstart', (event) => {
	if ((event.target || event.srcElement) === canvas) {
		event.preventDefault();
	}
	down(event.targetTouches[0]);
});
document.addEventListener('mousemove', move);
document.addEventListener('touchmove', (event) => {
	move(event.targetTouches[0]);
});
document.addEventListener('mouseup', up);
document.addEventListener('touchend', (event) => {
	up(event.targetTouches[0]);
});

const peerNet = new PeerNetwork('sig.amar.io');
peerNet.on('connection', (peer) => {
	peer.on('canvas', (() => {
		var canvasChunks = [];
		return (data) => {
			if (data == null) {
				var chunks = canvas.toDataURL('image/png').match(/[\s\S]{1,256}/g);
				for (var i = 0, len = chunks.length; i < len; ++i) {
					peer.send('canvas', {
						chunk: chunks[i],
						id: i,
						length: chunks.length
					});
				}
				return;
			}
			if (data.id === 0) {
				canvasChunks = [];
			}
			canvasChunks.push(data.chunk);
			if (data.id !== data.length - 1) {
				return;
			}
			var img = new Image();
			img.src = canvasChunks.join('');
			img.onload = () => {
				ctx.drawImage(img, 0, 0);
			};
		};
	})());
	peer.on('color', (color) => {
		this.color = color;
	});
	peer.on('dims', (dims) => {
		this.dims = dims;
		greatestWidth = Math.max(greatestWidth, dims.width);
		greatestHeight = Math.max(greatestHeight, dims.height);
		resizeCanvas(greatestWidth, greatestHeight);
	});
	peer.on('down', (event) => {
		this.prevX = event.x;
		this.prevY = event.y;
		this.isMouseDown = true;
	});
	peer.on('move', (event) => {
		if (!this.isMouseDown)
			return;
		ctx.strokeStyle = this.color || '#000000';
		ctx.beginPath();
		ctx.moveTo(this.prevX, this.prevY);
		ctx.lineTo(event.x, event.y);
		this.prevX = event.x;
		this.prevY = event.y;
		ctx.stroke();
	});
	peer.on('up', () => {
		this.isMouseDown = false;
	});
	peer.on('disconnect', () => {});
	peer.send('color', color);
	peer.send('dims', {
		width: canvas.width,
		height: canvas.height
	});
	if (!canvasReq) {
		peer.send('canvas');
		canvasReq = true;
	}
});
peerNet.on('uid', (uid) => {
	this.join("drawire." + room);
});
broadcast = (event, data) => {
	for (var i in peerNet.peers)
		peerNet.peers[i].send(event, data);
};

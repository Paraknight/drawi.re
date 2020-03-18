import PeerNetwork from "/lib/p2p-peer.js"

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
	peerNet.broadcast('dims', {
		width: canvas.width,
		height: canvas.height
	});
});

var colorPicker = document.getElementById('color-picker');
colorPicker.value = color;
colorPicker.onchange = () => {
	color = colorPicker.value;
	localStorage.color = color;
	peerNet.broadcast('color', color);
};

var down = (event) => {
	var rect = (event.target || event.srcElement).getBoundingClientRect();
	prevX = event.clientX - rect.left;
	prevY = event.clientY - rect.top;
	isMouseDown = true;
	peerNet.broadcast('down', {
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
	peerNet.broadcast('move', {
		x: prevX,
		y: prevY
	});
};

var up = () => {
	isMouseDown = false;
	peerNet.broadcast('up');
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

const peerNet = new PeerNetwork();
window.addEventListener('DOMContentLoaded', async (event) => {
	let roomID = window.location.pathname.substring(1);
	if (!roomID) {
		roomID = 'xxxxxx'.replace(/[x]/g, function(){
			return (Math.random() * 36 | 0).toString(36);
		});
		if (location.hostname === 'localhost')
			roomID = 'test';
		else
			window.history.replaceState({}, "New Room ID", "/" + roomID);
	}

	await peerNet.connect('https://sig.amar.io');
	//await peerNet.connect('http://localhost:8090');

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
			peer.color = color;
		});
		peer.on('dims', (dims) => {
			peer.dims = dims;
			greatestWidth = Math.max(greatestWidth, dims.width);
			greatestHeight = Math.max(greatestHeight, dims.height);
			resizeCanvas(greatestWidth, greatestHeight);
		});
		peer.on('down', (event) => {
			peer.prevX = event.x;
			peer.prevY = event.y;
			peer.isMouseDown = true;
		});
		peer.on('move', (event) => {
			if (!peer.isMouseDown)
				return;
			ctx.strokeStyle = peer.color || '#000000';
			ctx.beginPath();
			ctx.moveTo(peer.prevX, peer.prevY);
			ctx.lineTo(event.x, event.y);
			peer.prevX = event.x;
			peer.prevY = event.y;
			ctx.stroke();
		});
		peer.on('up', () => {
			peer.isMouseDown = false;
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
		peerNet.join('re.drawi.' + roomID);
	});
});

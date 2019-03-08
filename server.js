const express = require('express');

const app = express();

app.use(express.static('static'));

app.use((req, res) => res.sendFile('static/index.html', { root: './' }));

app.listen(process.env.PORT || 8093);

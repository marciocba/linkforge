const { createApp } = require('./app');

const port = Number(process.env.PORT) || 3001;
const app = createApp();

app.listen(port, () => {
  console.log(`LinkForge API listening on port ${port}`);
});

import { app } from './app.js';
import { env } from './env.js';

app.listen(env.port, () => {
  console.log(`Leads Analyzer running on http://localhost:${env.port}`);
});
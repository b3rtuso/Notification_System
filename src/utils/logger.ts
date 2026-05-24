const ts = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

const logger = {
  info:  (msg: string, meta?: object) => console.log(`[${ts()}] INFO: ${msg}`, meta ? JSON.stringify(meta) : ''),
  warn:  (msg: string, meta?: object) => console.warn(`[${ts()}] WARN: ${msg}`, meta ? JSON.stringify(meta) : ''),
  error: (msg: string, meta?: object) => console.error(`[${ts()}] ERROR: ${msg}`, meta ? JSON.stringify(meta) : ''),
};

export default logger;

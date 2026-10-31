const write = (level, message, metadata) => {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message: String(message),
    ...(metadata === undefined ? {} : { metadata }),
  };
  const line = JSON.stringify(entry);

  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
};

export const logger = Object.freeze({
  info: (message, metadata) => write('info', message, metadata),
  warn: (message, metadata) => write('warn', message, metadata),
  error: (message, metadata) => write('error', message, metadata),
});

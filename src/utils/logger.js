export function createLogger(verbose = false) {
  const ts = () => new Date().toISOString();
  const fmt = (lvl, msg) => `[${ts()}] ${lvl} ${msg}`;
  return {
    info: (m) => console.log(fmt("INFO", m)),
    warn: (m) => console.warn(fmt("WARN", m)),
    error: (m) => console.error(fmt("ERR ", m)),
    debug: (m) => { if (verbose) console.log(fmt("DBG ", m)); },
  };
}

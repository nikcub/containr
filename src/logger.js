import chalk from 'chalk';
import figlet from 'figlet';
import boxen from 'boxen';
import timestamp from 'time-stamp';

const defaultFormat = (level, log, ts, meta) => `${ts}${level} ${log} ${meta}\n`;

const logColors = {
  0: chalk.bold.red,
  1: chalk.yellow.bold,
  2: chalk.green.bold,
  3: chalk.white.bold,
  4: chalk.white,
  5: chalk.gray,
};

export const logLevels = {
  error: 0,
  warn: 1,
  banner: 2,
  info: 3,
  verbose: 4,
  debug: 5,
};

const logBanners = {
  error: chalk.bgRed.black('ERR'),
  warn: chalk.bgYellow.black('WARN'),
};

const defaultBoxOptions = {
  padding: 1,
  borderColor: 'red',
  borderStyle: 'double-single',
  dimBorder: false,
  margin: 0,
  float: 'left',
  backgroundColor: 'red',
  align: 'center',
};

const curLevel = logLevels.info;
const oldLog = console.log;

const getTimestamp = (format = 'HH:mm:ss') => {
  return chalk.grey('[') + chalk.white(timestamp(format)) + chalk.grey(']');
};

const dumpObject = (obj = null) => {
  if (!obj) return '';
  try {
    let str = JSON.stringify(obj, null, 4);
    return str;
  } catch (er) {
    oldLog(obj);
    return '[json error]';
  }
};

export const backupDump = (obj = null) => {
   return Object.keys(obj).join(', ');
};

class Logger {
  constructor() {
    for (const level of Object.keys(logLevels)) {
      this[level] = (msg, ...args) => this.logmsg(logLevels[level], msg, ...args);
    }
    this.levels = logLevels;
    this.curLevel = logLevels.info;

    // this.log = this.log.apply(this);
    return this;
  }

  // info (log, ...args) {
  //   return this.log(logLevels.info, ...args);
  // }

  setLevel(level) {
    if (!/\d+/.test(level)) {
      if (!level in logLevels) {
        this.error('Invalid logging level ' + level);
        return false;
      }
      level = logLevels[level];
    } else {
      if (!level > 0 && level <= Object.keys(logLevels).length) {
        this.error(`Invalid logging level: ${level}`);
        return false;
      }
    }

    this.info('Set logging level to ' + Object.keys(logLevels)[level]);
    this.curLevel = level;
    return this;
  }

  box(log, options = {}) {
    let box = boxen(log, Object.assign(defaultBoxOptions, options));
    process.stdout.write(box + '\n');
    return this;
  }

  text(log, options={}) {
    let textMessage = figlet.textSync(log, {
      horizontalLayout: 'default',
      verticalLayout: 'default',
    });
    process.stdout.write(chalk.white.bold(textMessage) + '\n');
    return this;
  }

  info(log, ...meta) {
    return this.logmsg(logLevels.info, log, ...meta);
  }

  logmsg(level, log, ...meta) {
    if (level > this.curLevel) return this;

    log = (log instanceof Object) ? dumpObject(log) : log;
    meta = meta.map(dumpObject).join(' ');
    let timeStamp = getTimestamp();
    if (typeof logColors[level] === 'function') {
      log = logColors[level](log);
      meta = logColors[level](meta);
    } else {
      console.error(`Not a function - ${logColors[level]} for level ${level} in ${logColors}`);
    }
    // meta = meta ? dumpObject(meta) : '';

    level = (Object.keys(logLevels))[level];
    let levelBanner = (level in logBanners) ? ' ' + logBanners[level] : '';

    var logLine = defaultFormat(levelBanner, log, timeStamp, meta);
    process.stdout.write(logLine);
    return this;
  }


}

const l = new Logger();
console.log = l.info;
export default l;

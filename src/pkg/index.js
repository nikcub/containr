import path from 'path';
import { exec } from 'shelljs';
import l from '../logger';

const npmPackageName = /^(?:@([^/]+?)[/])?([^/]+?)$/;

/**
 *
 */
const parsePackageName = (rawName = null) => {
  if (!(typeof rawName === 'string')) {
    return false;
  }
  try {
    const [, scope, name] = rawName.match(npmPackageName);
    if (scope) {
      return `${scope}/${name}`;
    }
    return name;
  } catch (error) {
    console.error(`parsePackageName error: ${error.message}`);
    return false;
  }
};

/**
 *
 */
const getGitTag = () => {
  const commandString = 'git rev-parse --short HEAD';
  const eh = exec(commandString, { silent: true });
  if (eh.code === 0) {
    return {
      success: true,
      content: eh.stdout.trim(),
    };
  }
  return {
    success: false,
    message: eh.stderr.trim(),
  };
};

/**
 * getLocalPkg
 *
 * get the package.json file as JSON for the local package
 */
const getLocalPkg = (pkgDir = null) => {
  const pkgPath = path.join((pkgDir) ? pkgDir : process.cwd(), 'package.json');
  try {
    const pkgContents = require(pkgPath); //eslint-disable-line
    return {
      success: true,
      content: pkgContents,
    };
  } catch (e) {
    return {
      success: false,
      content: ('' + e).trim(),
    }
  }
};




/**
 *
 */
const getDependanciesCommand = (dev = false) => {
  let extra = '';
  let pkgVersionString = '';
  if (dev) {
    extra = '--dev';
  }
  const npmCmdList = `npm ls --json --depth 1 ${extra}`;
  let eh = exec(npmCmdList, { silent: true });
  let pkg = JSON.parse(eh);
  for (let [name, val] of entries(pkg.dependencies)) {
    let version = val.version || '';
    pkgVersionString += `${name}:${version}:`;
  }
  return pkgVersionString;
};

class Pkg extends Object {
  constructor(dir = null) {
    super();
    const pkgLocalResp = getLocalPkg(dir);
    if (!pkgLocalResp.success) {
      l.error(`package.json error - ${pkgLocalResp.message}`);
      l.info('Init npm for this repository with "npm init"');
      return false;
    }
    this._pkgLocal = pkgLocalResp.content;

    const gitTagResp = getGitTag();
    if (!gitTagResp.success) {
      l.error(`git error - ${gitTagResp.message}`);
      l.info('Init git for this repository with "git init"');
      return false;
    }
    this._gitTagLocal = gitTagResp.content;

    this._nameLocal = ('name' in this._pkgLocal) ? this._pkgLocal.name : '';

    this._nameCleanLocal = parsePackageName(this._nameLocal) || 'unnamed';

    this._labels = [];
    if (this._pkgLocal.description) {
      this._descriptionLocal = this._pkgLocal.description;
      this._labels.push({
        name: 'description',
        values: this._pkgLocal.description,
      });
    }

    return this;
  }

  // getters and setters
  get gitTag() {
    return this._gitTagLocal;
  }

  get name() {
    return this._nameLocal;
  }

  get imageName() {
    return this._nameCleanLocal;
  }

  get imageNameTagged() {
    return `${this.imageName}:${this.tag}`;
  }

  get tag() {
    return this.gitTag;
  }

  get version() {
    return this._pkgLocal.version || '';
  }

  get description() {
    return this._descriptionLocal || '';
  }

  get dependencies() {
    return this._pkgLocal.dependencies || {};
  }

  get devDependencies() {
    return this._pkgLocal.devDependencies || {};
  }

  get peerDependancies() {
    return this._pkgLocal.peerDependancies || {};
  }

  get raw() {
    return this._pkgLocal;
  }

  get labels() {
    return this._labels || [];
  }


}

const setup = (pkgPath = null) => new Pkg(pkgPath);

export default {
  setup,
  parsePackageName,
};

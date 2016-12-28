import path from 'path';
import { exec } from 'shelljs';
import { imageExists } from './docker';


const npmPackageName = /^(?:@([^/]+?)[/])?([^/]+?)$/;

/**
 *
 */
export const getPackageLabels = (pkg) => {
  const labels = [];

  if (pkg.description) {
    labels.push({
      name: 'description',
      value: pkg.description,
    });
  }

  return labels;
};


/**
 *
 */
export const parsePackageName = (rawName = null) => {
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
export const getGitTag = () => {
  const commandString = 'git rev-parse --short HEAD';
  const eh = exec(commandString, { silent: true });
  if (eh.code === 0) {
    return eh.stdout.trim();
  }
  return false;
};

/**
 * getLocalPkg
 *
 * get the package.json file as JSON for the local package
 */
export const getLocalPkg = () => {
  const pkgPath = path.join(process.cwd(), 'package.json');
  try {
    const pkgContents = require(pkgPath); //eslint-disable-line
    return pkgContents;
  } catch (e) {
    return false;
  }
};

/**
 *
 */
export const getDependancies = (pkg, dev = true) => {
  return Object.assign(
    {},
    ('dependencies' in pkg) ? pkg.dependencies : {},
    ('devDependencies' in pkg && dev) ? pkg.devDependencies : {},
  );
};


/**
 *
 */
export const getDependanciesCommand = (dev = false) => {
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


export default {
  getPackageLabels,
  parsePackageName,
  getGitTag,
};

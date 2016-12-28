import path from 'path';
import { exec } from 'shelljs';
import crypto from 'crypto';
import docker from './docker';
import pkg, { getDependancies } from './pkg';
import templating from './templating';
import l from './logger';


/**
 *
 */
export const geLayerHash = pkgList => crypto.createHash('sha256').update(pkgList).digest('hex');



/**
 * Used to iterate object keys
 *
 * @param {any} obj
 */
function* entries(obj) {
  for (let key of Object.keys(obj)) {
    yield [key, obj[key]];
  }
}

/**
 * flattenDependancies
 *
 * takes an object with keys of package names and values of versions
 * from npm package.json and flattens it into a single string of format
 *
 * name:version:name:version .. etc.
 */
const flattenDependancies = (pkgList) => {
  let pkgVersionString = '';
  for (const [name, val] of entries(pkgList)) {
    pkgVersionString += `${name}:${val}:`;
  }
  return pkgVersionString;
};

/**
 * getLayerImageName
 *
 * take a list of packages and return a short hash name
 */
const getLayerImageName = (pkg) => {
  const depsList = getDependancies(pkg);
  const depsListFlat = flattenDependancies(depsList);
  const depsListHash = geLayerHash(depsListFlat);
  const shortHash = depsListHash.substr(-12);
  return `npmlayer/${shortHash}`;
};

/**
 * getNpmLayer
 */
export const getNpmLayer = (baseImg = 'mhart/alpine-node', pkg) => {
  const npmLayerImageName = getLayerImageName(pkg);

  l.info(`package layer npm: ${npmLayerImageName}`);

  if (docker.imageExists(npmLayerImageName)) {
    l.verbose(`npm layer image found: ${npmLayerImageName}`);
    return npmLayerImageName;
  } else {
    l.verbose('npm layer not found building');
  }

  // we need to build the image;
  const dockerFile = templating.renderFile('Dockerfile.npm-layer.ejs', {
    pkg,
    containr: {
      baseImg,
    },
  });

  const npmContainer = docker.buildImage({
    dockerfile: dockerFile,
    name: npmLayerImageName,
  });

  if (npmContainer.success) {
    const { name, version, hash } = npmContainer;
    l.info(`new npm layer image built ${name}:${version} => ${hash}`);
  } else {
    l.error(`${npmContainer.message}`);
  }

  return npmContainer.name;
};

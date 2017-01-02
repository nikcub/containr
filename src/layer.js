import path from 'path';
import { exec } from 'shelljs';
import crypto from 'crypto';
import docker from './docker';
import templating from './templating';
import l from './logger';


/**
 *
 */
export const getNpmLayerHash = pkgList => crypto.createHash('sha256').update(pkgList).digest('hex');



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
 * flattenNpmDependancies
 *
 * takes an object with keys of package names and values of versions
 * from npm package.json and flattens it into a single string of format
 *
 * name:version:name:version .. etc.
 */
const flattenNpmDependancies = (pkgList) => {
  let pkgVersionString = '';
  for (const [name, val] of entries(pkgList)) {
    pkgVersionString += `${name}:${val}:`;
  }
  return pkgVersionString;
};

/**
 * getNpmDependancies
 */
const getNpmDependancies = (pkg, dev = true) => {
  return Object.assign(
    {},
    ('dependencies' in pkg) ? pkg.dependencies : {},
    ('devDependencies' in pkg && dev) ? pkg.devDependencies : {},
  );
};


/**
 * getNpmLayerImageName
 *
 * take a list of packages and return a short hash name
 */
const getNpmLayerImageName = (baseImg, pkg) => {
  const baseImgClean = baseImg.replace(/\/|:/g, '-');
  const depsList = getNpmDependancies(pkg);
  const depsListFlat = flattenNpmDependancies(depsList);
  const depsListHash = getNpmLayerHash(depsListFlat);
  const shortHash = depsListHash.substr(-12);
  return `npmlayer/${baseImgClean}:${shortHash}`;
};

/**
 * getNpmLayer
 */
export const getNpmLayer = (baseImg = 'mhart/alpine-node', pkg) => {
  const npmLayerImageName = getNpmLayerImageName(baseImg, pkg);

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

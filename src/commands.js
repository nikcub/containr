/**
 * Containr commands for cli
 *
 * see README
 */

import path from 'path';
import l, { logLevels } from './logger';
import { getLocalPkg, getGitTag, parsePackageName } from './pkg';
import docker, { imageExists } from './docker';
import templating from './templating';
import packageJson from '../package.json';

let defaultRunCommandOptions = {
  imagefile: 'Dockerfile',
  production: false,
  development: false,
  client: true,
  server: false,
  watch: false,
  configFile: 'builder.config.js',
};

/**
 * Print a banner on application startup
 */
export const printBanner = () => {
  const version = packageJson.version;
  l.banner(`containr v${version}`);
};

/**
 * Build the current image
 */
export const build = (buildFile = 'Dockerfile', options = {}) => {
  const buildEnv = (options.production) ? 'production' : 'development';
  const pkgLocal = getLocalPkg();
  const { name, version } = pkgLocal;

  if (options.verbose) {
    l.setLevel(logLevels.debug);
  }

  l.info(`Building ${name}@${version} from ${buildFile}`);
  l.debug(`Mode: ${buildEnv}`);

  let filePath = null;

  if (templating.isEjs(buildFile)) {
    filePath = templating.renderFile(buildFile, { pkg: pkgLocal });
  } else {
    filePath = path.resolve(process.cwd(), buildFile);
  }

  const gitTag = getGitTag();
  const imageHash = docker.buildImage({
    dockerfile: filePath,
    version: gitTag,
    name: parsePackageName(pkgLocal.name),
    verbose: options.verbose,
  });

  if (!imageHash.success) {
    l.error(`build error: ${imageHash.message}`);
    return false;
  }

  const { name: imgName, version: imgVersion, hash } = imageHash;
  l.info(`built ${imgName}:${imgVersion} => ${hash}`);
  return true;
};

/**
 *
 */
export const tag = (tagVersion = '', options = {}) => {
  const pkgLocal = getLocalPkg();
  const containerName = parsePackageName(pkgLocal.name);
  const gitTag = getGitTag();

  if (options.verbose) {
    l.setLevel(logLevels.debug);
  }

  const fromTag = `${containerName}:${gitTag}`;

  if (!docker.imageExists(fromTag)) {
    l.error(`Error: could not find ${fromTag}`);
    return false;
  }

  const version = (tagVersion) ? tagVersion : pkgLocal.version;
  const toTag = `${containerName}:${version}`;

  const tagExec = docker.tagContainer({
    from: fromTag,
    to: toTag,
    verbose: options.verbose,
  });

  if (tagExec.success) {
    l.info(`Tagged as: ${toTag}`);
    return true;
  }

  l.error(`${tagExec.message}`);
  return false;
};

/**
 *
 */
export const push = (tagVersion = '', options = {}) => {
  const pkgLocal = getLocalPkg();
  const imageName = parsePackageName(pkgLocal.name);
  const gitTag = getGitTag();
  const containerVersion = pkgLocal.version;

  if (options.verbose) {
    l.setLevel(logLevels.debug);
  }

  let localTags = [];

  if (tagVersion) {
    localTags = [tagVersion];
  } else {
    localTags = ['latest', containerVersion, gitTag];
  }

  localTags.forEach((localTag) => {
    const imageNameTagged = `${imageName}:${localTag}`;
    if (docker.imageExists(imageNameTagged)) {
      const pushExec = docker.pushImage({
        tag: imageNameTagged,
        verbose: options.verbose,
      });

      if (pushExec.success) {
        l.info(`Pushed: ${imageNameTagged}`);
      }
    } else if (tagVersion) {
      l.warn(`Tag not found: ${imageName}${tagVersion}`);
    }
  });
};

export const test = () => {
  const pkgLocal = getLocalPkg();
  const imageName = parsePackageName(pkgLocal.name);
  const gitTag = getGitTag();
  const imageNameTagged = `${imageName}:${gitTag}`;

  if (docker.imageExists(imageNameTagged)) {
    const testExec = docker.runContainer({
      tag: imageNameTagged,
    });

    if (testExec.success) {
      l.info(`Running: ${imageNameTagged}`);
    } else {
      l.error(`${testExec.message}`);
    }
  } else {
    l.warn(`${imageNameTagged} doesn't exist run 'containr build'`);
  }
};

/**
 *
 */
export const release = () => {
  tag('latest');
  push();
};


export default {
  printBanner,
  build,
  tag,
  test,
  push,
  release,
};

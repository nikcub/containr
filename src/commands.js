/**
 * Containr commands for cli
 *
 * see README
 */

import path from 'path';
import l, { logLevels } from './logger';
import pkg from './pkg/register';
import docker from './docker';
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
  if (options.verbose) {
    l.setLevel(logLevels.debug);
  }

  l.info(`Building ${pkg.imageName}@${pkg.version} from ${buildFile}`);
  l.debug(`Mode: ${buildEnv}`);

  let filePath = null;

  if (templating.isEjs(buildFile)) {
    filePath = templating.renderFile(buildFile, { pkg });
  } else {
    filePath = path.resolve(process.cwd(), buildFile);
  }

  l.debug(`gitTag: ${pkg.gitTag}`);

  const imageHash = docker.buildImage({
    dockerfile: filePath,
    version: pkg.gitTag,
    name: pkg.imageName,
    verbose: options.verbose,
  });

  if (!imageHash.success) {
    l.error(`build error: ${imageHash.message}`);
    return false;
  }

  const { hash } = imageHash;
  l.info(`built ${pkg.imageName}:${pkg.version} => ${hash}`);
  return true;
};

/**
 *
 */
export const tag = (tagVersion = '', options = {}) => {
  if (options.verbose) {
    l.setLevel(logLevels.debug);
  }

  const fromTag = `${pkg.imageName}:${pkg.gitTag}`;

  if (!docker.imageExists(fromTag)) {
    l.error(`Error: could not find ${fromTag}`);
    return false;
  }

  const version = (tagVersion) ? tagVersion : pkg.version;
  const toTag = `${pkg.imageName}:${version}`;

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
  if (options.verbose) {
    l.setLevel(logLevels.debug);
  }

  let localTags = [];

  if (tagVersion) {
    localTags = [tagVersion];
  } else {
    localTags = ['latest', pkg.version, pkg.gitTag];
  }

  localTags.forEach((localTag) => {
    const imageNameTagged = `${pkg.imageName}:${localTag}`;
    if (docker.imageExists(imageNameTagged)) {
      const pushExec = docker.pushImage({
        tag: imageNameTagged,
        verbose: options.verbose,
      });

      if (pushExec.success) {
        l.info(`Pushed: ${imageNameTagged}`);
      }
    } else if (tagVersion) {
      l.warn(`Tag not found: ${pkg.imageName}${tagVersion}`);
    }
  });
};

export const test = (cmd = '', options = {}) => {
  if (options.verbose) {
    l.setLevel(logLevels.debug);
  }

  const imageNameTagged = `${pkg.imageName}:${pkg.gitTag}`;

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

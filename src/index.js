
import { exec } from 'shelljs';
import ejs from 'ejs';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import tmp from 'tmp';

const npmPackageName = /^(?:@([^/]+?)[/])?([^/]+?)$/;
const isImageHash = /[a-f0-9]{12}/igm;

/**
 * Run command for 'run' (default) on cli
 *
 * @param {any} [filePath=undefined]
 * @param {any} [commandOptions={}]
 */
let runCommand = (filePath) => {
  console.log("Running build in " + process.cwd());
  return 1;
}

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
}

/**
 * Trigger automated build in Docker repository
 */
const trigger = ({ code }) => {

}

/***
 * Get the contents of a Docker file from templates
 */
const getDockerfile = (pathname, vars) => {

}

/**
 *
 */
const getNpmPackages = (dev = false) => {
  let extra  = '';
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

const getNpmLayerHash = (pkgList) => {
  return crypto.createHash('sha256').update(pkgList).digest('hex');
};

const getGitTag = () => {
  const commandString = `git rev-parse --short HEAD`;
  const eh = exec(commandString, { silent: true });
  if (eh.code === 0) {
    return eh.stdout.trim();
  }
  return false;
}

const renderFile = (templateName, vars = {}, options = {}) => {
  let templateRendered;
  let templateContent;
  let templatePath;
  // const templateFileName = (!templateName.endsWith('.ejs')) ? `${templateName}.ejs` : templateName;
  const templateFileName = templateName;

  const templateSearchPaths = [
    process.cwd(),
    path.join(process.cwd(), 'share'),
    __dirname,
    path.join(__dirname, 'share'),
    path.join(__dirname, '..', 'share'),
  ];

  for (let templateDir of templateSearchPaths) {
    templatePath = path.join(templateDir, templateFileName);
    if (fs.existsSync(templatePath)) {
      break;
    }
  }

  try {
    templateContent = fs.readFileSync(templatePath).toString('utf-8');
  } catch (error) {
    console.error(` * error: no such file or read error: ${error.message}`);
    return false;
  }
  try {
    templateRendered = ejs.render(templateContent, vars, options);
  } catch (renderError) {
    console.error(`Rendering error: ${renderError.message}`);
    return '';
  }
  return templateRendered;
};

const getNpmLayerImageName = hash => {
  const shortHash = hash.substr(-12);
  return `npmlayer/${shortHash}`;
};

const imageExists = (imageName) => {
  const commandString = `docker images -q ${imageName}`;
  const eh = exec(commandString, { silent: true });
  if (eh.code === 0 && isImageHash.test(eh.stdout)) {
    return true;
  }
  return false;
};

const buildContainer = (options = {}) => {
  const userOptions = Object.assign({}, {
    dockerfile: 'Dockerfile',
    cmdOptions: ['--force-rm'],
    name: 'temp-container',
    version: '',
    context: '.',
  }, options);

  const { dockerfile, cmdOptions, name, context } = userOptions;
  let { version } = userOptions;

  if (version.length) {
    version = `:${version}`;
  }

  let optionsStr;
  if (Array.isArray(cmdOptions) && cmdOptions.length) {
    optionsStr = userOptions.cmdOptions.join(' ');
  } else {
    optionsStr = '';
  }

  const commandString = `docker build -t ${name}${version} ${optionsStr} -f ${dockerfile} ${context}`;
  // console.log(`Building: ${commandString}`);
  const buildExec = exec(commandString, { silent: true });

  if (buildExec.code === 0) {
    const [, buildId] = buildExec.stdout.match(/Successfully built ([a-f0-9]{12})/im);
    return {
      success: true,
      hash: buildId,
      name,
      version,
    };
  }

  const errMsg = buildExec.stderr.split('\n').filter(x => x.length > 0).join(' ');
  console.log(" * build error:", errMsg);

  return {
    success: false,
  };
};

const writeTempFile = (content) => {
  const tf = tmp.fileSync({ mode: '0644', dir: process.cwd(), prefix: 'containr-', postfix: '' });
  fs.writeFileSync(tf.fd, content);
  return tf.name;
};

const getNpmLayer = (pkg) => {
  const pkgVersionString = getNpmPackages();
  const npmLayerHash = getNpmLayerHash(pkgVersionString);
  const npmLayerImageName = getNpmLayerImageName(npmLayerHash);
  if (imageExists(npmLayerImageName)) {
    console.info(` * npm layer image: ${npmLayerImageName}`);
    return {
      name: npmLayerImageName,
      hash: '',
    };
  }
    // we need to build the image;
  const dockerFileContent = renderFile('Dockerfile.npm-layer.ejs', { pkg });
  if (!dockerFileContent) {
    return {
      success: false,
    };
  }
  const dockerFilePath = writeTempFile(dockerFileContent);
  const npmContainer = buildContainer({
    dockerfile: dockerFilePath,
    name: npmLayerImageName,
  });

  if (npmContainer.success) {
    const { name, version, hash } = npmContainer;
    console.log(` * new npm layer image built ${name}:${version} => ${hash}`);
  } else {
    console.error('Build error');
  }

  return npmContainer;
};

const getPackageLabels = (pkg) => {
  const labels = [];

  if (pkg.description) {
    labels.push({
      name: 'description',
      value: pkg.description,
    });
  }

  return labels;
};

// commands

const build = (pkg, args = []) => {
  const { name, version, author } = pkg;
  let [dockerfile] = args;
  if (!dockerfile) {
    dockerfile = 'Dockerfile';
  }
  console.info(` => ${name}@${version} building ${dockerfile}`);
  const npmlayer = getNpmLayer(pkg);
  if (!npmlayer.success) {
    return 1;
  }
  const containr = {
    imageName: parsePackageName(pkg.name),
  };
  const { name: npmlayername } = npmlayer;
  const labels = getPackageLabels(pkg);
  const dockerFileContent = renderFile(dockerfile, {
    pkg,
    labels,
    containr,
    npmlayer,
  });
  const dockerFilePath = writeTempFile(dockerFileContent);
  const gitTag = getGitTag();
  const imageHash = buildContainer({
    dockerfile: dockerFilePath,
    version: gitTag,
    name: parsePackageName(pkg.name),
  });

  if (!imageHash.success) {
    return 1;
  }

  const { name: imgName, version: imgVersion, hash } = imageHash;
  console.info(` * built ${imgName}:${imgVersion} => ${hash}`);
};

const tag = (pkg, args = []) => {
  const name = parsePackageName(pkg.name);
  const gitTag = getGitTag();
  const fromTag = `${name}:${gitTag}`;
  if (!imageExists(fromTag)) {
    console.error(` * error: could not find ${fromTag}`);
    return 1;
  }

  let [version] = args;
  if (!version) {
    version = pkg.version;
  }
  const toTag = `${name}:${version}`;

  const execCommand = `docker tag ${fromTag} ${toTag}`;
  const eh = exec(execCommand);
  if (eh.code === 0) {
    console.log(` * tagged as ${toTag}`);
    return 0;
  }

  const msg = eh.stderr + ' '  + eh.stdout;
  console.log(` * error: ${msg}`);
  return 1;
};

const test = (pkg, args = []) => {
  const name = parsePackageName(pkg.name);
  const gitTag = getGitTag();
  const imgName = `${name}:${gitTag}`;
  if (!imageExists(imgName)) {
    build(pkg, args);
  }
  const execCommand = `docker run --rm -P ${imgName}`;
  const eh = exec(execCommand);
  return eh.code;
};

const push = (pkg, args = []) => {
  const name = parsePackageName(pkg.name);
  let [version] = args;
  if (!version) {
    version = pkg.version;
  }
  // const gitTag = getGitTag();
  const imgName = `${name}:${version}`;
  if (!imageExists(imgName)) {
    console.error(` * error: could not find ${imgName}`);
    return 1;
  }

  const execCommand = `docker push ${imgName}`;
  const eh = exec(execCommand);
  return eh.code;
};

const release = (pkg, args = []) => {
  const ret = build(pkg, args);
};

const run = ({ pkg, command, args }) => {
  let returnCode = null;

  switch (command) {
    case 'build':
      returnCode = build(pkg, args);
      break;
    case 'tag':
      returnCode = tag(pkg, args);
      break;
    case 'release':
      returnCode = release(pkg, args);
      break;
    case 'push':
      returnCode = push(pkg, args);
      break;
    case 'test':
      returnCode = test(pkg, args);
      break;
    default:
      console.error('Invalid command.');
      process.exit(1);
  }

  process.exit(returnCode);
};

export default {
  run,
  runCommand,
};


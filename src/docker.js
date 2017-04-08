import { exec } from 'shelljs';
import { spawn } from 'child_process';
import l from './logger';

const isImageHash = /[a-f0-9]{12}/igm;

export const imageExists = (imageName) => {
  const commandString = `docker images -q ${imageName}`;
  const eh = exec(commandString, { silent: true });
  const hashValue = eh.stdout.trim();
  if (eh.code === 0 && hashValue.match(isImageHash)) {
    return true;
  }
  return false;
};

export const tagContainer = (options = {}) => {
  const userOptions = Object.assign({
    verbose: false,
  }, options);

  const { to: toTag, from: fromTag, verbose } = userOptions;

  const commandString = `docker tag ${fromTag} ${toTag}`;
  l.debug(`${commandString}`);
  const buildExec = exec(commandString, { silent: true });

  if (verbose && buildExec.stdout.length) {
    l.debug(buildExec.stdout);
  }

  if (buildExec.code === 0) {
    // const [, buildId] = buildExec.stdout.match(/Successfully built ([a-f0-9]{12})/im);
    return {
      success: true,
      // hash: buildId,
    };
  }

  return {
    success: false,
    message: buildExec.stderr.trim(),
  };
};


export const pushImage = (options = {}) => {
  const userOptions = Object.assign({
    verbose: false,
  }, options);

  const { tag = 'latest', verbose } = userOptions;

  const commandString = `docker push ${tag}`;
  l.debug(`${commandString}`);
  const buildExec = exec(commandString, { silent: false });

  if (verbose && buildExec.stdout.length) {
    l.debug(buildExec.stdout);
  }

  if (buildExec.code === 0) {
    // const [, buildId] = buildExec.stdout.match(/Successfully built ([a-f0-9]{12})/im);
    return {
      success: true,
      // hash: buildId,
    };
  }

  return {
    success: false,
    message: buildExec.stderr.trim(),
  };
};



export const runContainer = (options = {}) => {
  const userOptions = Object.assign({
    verbose: false,
  }, options);

  const { tag } = userOptions;

  const argString = `run --rm -P -it ${tag}`;

  const buildExec = spawn('docker', argString.split(' '), {
    stdio: 'inherit',
  });

  buildExec.on('close', (code) => {
    l.banner(`Exited test process (${code})`);
  });
};


export const buildImage = (options = {}) => {
  const userOptions = Object.assign({}, {
    dockerfile: 'Dockerfile',
    cmdOptions: ['--force-rm'],
    name: 'temp-container',
    version: '',
    context: '.',
    verbose: false,
  }, options);

  const { dockerfile, cmdOptions, version, context, verbose } = userOptions;
  let { name } = userOptions;

  l.debug(`Building - version is ${version} name is ${name}`);
  l.debug(`options.version ${options.version}`);
  l.debug(`userOptions.version ${userOptions.version}`);
  l.debug(`version - ${version}`);

  if (version.length) {
    name = `${name}:${version}`;
  }

  l.debug(`Building - name is now ${name}`);

  let optionsStr;
  if (Array.isArray(cmdOptions) && cmdOptions.length) {
    optionsStr = userOptions.cmdOptions.join(' ');
  } else {
    optionsStr = '';
  }

  const commandString = `docker build -t ${name} ${optionsStr} -f ${dockerfile} ${context}`;
  l.debug(`Building: ${commandString}`);
  const buildExec = exec(commandString, { silent: true });

  if (buildExec.stdout.length) {
    l.info(buildExec.stdout);
  }

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

  return {
    success: false,
    message: errMsg,
  };
};

export default {
  imageExists,
  tagContainer,
  pushImage,
  runContainer,
  buildImage,
};

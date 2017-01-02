import fs from 'fs';
import path from 'path';
import ejs from 'ejs';
import tmp from 'tmp';
import { getNpmLayer } from './layer';
import l from './logger';

tmp.setGracefulCleanup();

const getTemplate = (templateName) => {
  const templateSearchPaths = [
    process.cwd(),
    path.join(process.cwd(), 'share'),
    __dirname,
    path.join(__dirname, 'share'),
    path.join(__dirname, '..', 'share'),
  ];

  let templatePath = null;

  for (const templateDir of templateSearchPaths) {
    templatePath = path.join(templateDir, templateName);
    if (fs.existsSync(templatePath)) {
      break;
    }
  }

  try {
    return fs.readFileSync(templatePath).toString('utf-8');
  } catch (error) {
    console.error(` * error: no such file or read error: ${error.message}`);
    return false;
  }
};

const renderContent = (templateContent, vars = {}, options = {}) => {
  l.debug('renderContent', templateContent, vars);
  try {
    let res = ejs.render(templateContent, vars, options);
    l.debug(res);
    return res;
  } catch (renderError) {
    console.error(`Rendering error: ${renderError.message}`);
    return '';
  }
};

const writeTempFile = (content) => {
  const tmpDir = process.cwd();
  const tf = tmp.fileSync({
    mode: '0644',
    dir: tmpDir,
    prefix: '.tmp-containr-',
    postfix: '',
  });
  fs.writeFileSync(tf.fd, content);
  return tf.name;
};

const renderTemplate = (templateContent, templateVars = {}) => {

  const { pkg, labels } = templateVars;

  const layer = Object.assign({
    npm: baseLayer => getNpmLayer(baseLayer, pkg),
  }, templateVars.layer || {});

  const containr = Object.assign({
    imageName: pkg.imageName,
  }, templateVars.containr || {});

  const dockerFileContent = renderContent(templateContent, {
    pkg,
    labels,
    layer,
    containr,
  }, {
    // debug: true,
  });

  // console.log(dockerFileContent);
  const dockerFilePath = writeTempFile(dockerFileContent);
  return dockerFilePath;
};

const renderFile = (fileName, vars = {}) => {
  const templateContent = getTemplate(fileName);
  return renderTemplate(templateContent, vars);
};

const getExtension = (filename = '') => {
  if (filename.indexOf('.') === -1) {
    return '';
  }
  return filename.split('.').pop();
};

const isEjs = (filename = '') => getExtension(filename) === 'ejs';

export default {
  renderFile,
  writeTempFile,
  getExtension,
  isEjs,
};

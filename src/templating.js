import fs from 'fs';
import path from 'path';
import ejs from 'ejs';
import tmp from 'tmp';
import { getNpmLayer } from './layer';
import pkg from './pkg';

tmp.setGracefulCleanup();

export const getTemplate = (templateName) => {
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

export const renderContent = (templateContent, vars = {}, options = {}) => {
  try {
    return ejs.render(templateContent, vars, options);
  } catch (renderError) {
    console.error(`Rendering error: ${renderError.message}`);
    return '';
  }
};

export const writeTempFile = (content) => {
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

export const renderTemplate = (templateContent, vars = {}) => {
  const pkgLocal = pkg.getLocalPkg();
  const labels = pkg.getPackageLabels(pkg);

  const layer = Object.assign({
    npm: baseLayer => getNpmLayer(baseLayer, pkg),
  }, vars.layer || {});

  const containr = Object.assign({
    imageName: pkg.parsePackageName(pkg.name),
  }, vars.containr || {});

  // const templateVars = Object.assign({
  // })

  const dockerFileContent = renderContent(templateContent, {
    pkg: pkgLocal,
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

export const renderFile = (fileName, vars = {}) => {
  const templateContent = getTemplate(fileName);
  return renderTemplate(templateContent, vars);
};

export const getExtension = (filename = '') => {
  if (filename.indexOf('.') === -1) {
    return '';
  }
  return filename.split('.').pop();
};

export const isEjs = (filename = '') => getExtension(filename) === 'ejs';

export default {
  renderFile,
  writeTempFile,
  getExtension,
  isEjs,
};

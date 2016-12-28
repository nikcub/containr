import fs from 'fs';
import path from 'path';
import ejs from 'ejs';
import tmp from 'tmp';
import { getNpmLayer } from './layer';
import { parsePackageName, getPackageLabels } from './pkg';

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

export const renderTemplate = (templateContent, pkg = {}) => {

  // const npmlayer = getNpmLayer(pkg);
  // if (!npmlayer.success) {
    // return 1;
  // }
  // console.log(npmlayer);
  const layer = {
    npm: baseLayer => getNpmLayer(baseLayer, pkg),
  };

  const containr = {
    imageName: parsePackageName(pkg.name),
  };

  const labels = getPackageLabels(pkg);
  const dockerFileContent = renderContent(templateContent, {
    pkg,
    labels,
    containr,
    layer,
  }, {
    // debug: true,
  });

  // console.log(dockerFileContent);
  const dockerFilePath = writeTempFile(dockerFileContent);
  return dockerFilePath;
};

export const renderFile = (fileName, pkg = {}) => {
  const templateContent = getTemplate(fileName);
  return renderTemplate(templateContent, pkg);
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

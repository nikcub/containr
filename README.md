# Docker container builds for nodejs projects

Automatically build Docker images and run Docker contains for a project with support for npm.

## Features

* Automatically tag Docker images with version numbers
* Release and push Docker images after testing
* Integrated into npm plugin hooks
* Support for npm layers to speed up and share package installs in containers
* Support for Docker files as EJS templates

## install

```sh
$ npm install --save containr
```

## Quickstart

Build a container (default filename is `Dockerfile`)

```sh
$ containr build <filename>
```

In `package.json`:

```json
  ...
  "scripts": {
    "postversion": "containr build && containr tag && containr push",
```
then:

```sh
$ npm version patch
<images build with new version ... >
```
## Workflow Example

Create a new repo for a Docker image from an example package:

```sh
$ mkdir test-project
$ cd test-project
$ npm init -y
$ npm install -S express
$ npm install -S containr
```

Set it up as a `git` repository (required):

```sh
$ git init
$ git add .
$ git ci -m 'init'
```

Create a simple example app:

```sh
$ cat << EOF >> server.js
const express = require('express');
let app = express();

app.get('/', (req, res) => {
  res.json({result: 'Test response'});
});

app.listen(3080, () => {
  console.log('Listening on 3080');
});
EOF
$
```

Edit the `package.json` and add an npm hook for postversion which will build the container:

```json
{
  "name": "test-repo",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "postversion": "containr build && containr tag && containr push"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "express": "~4.14.0"
  }
}
```

Create a simple `Dockerfile.ejs` with npm package layer support:

*`layer.npm` accepts a single parameter which is the base image to build from. It defaults to Alpine Linux node.*

```sh
$ cat << EOF > Dockerfile.ejs
> FROM <% layer.npm() %>
>
> WORKDIR /src
> ADD . /src
> EXPOSE 3080
> CMD ["/usr/bin/npm", "start"]
> EOF
```

Test the build:



## Commands

* `build` - build a container
* `tag` - tag a container with the default package version
* `push` - push to the repo
* `release` - mark the current image release as latest and push
* `test` - test the image in a temporary container
* `run` - run the container


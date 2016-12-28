# Docker container builds for nodejs projects

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
    "preversion": "npm run build",
    "postversion": "containr build && containr tag && containr publish",
```
then:

```sh
$ npm version patch
<images build with new version ... >
```

## Commands

* `build` - build a container
* `tag` - tag a container with the default package version
* `push` - push to the repo
* `release` - mark the current image release as latest and push
* `test` - test the image in a temporary container
* `run` - run the container


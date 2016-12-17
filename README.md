# Docker container builds for nodejs projects

```sh
$ npm install --save containr
```

```sh
$ containr build
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



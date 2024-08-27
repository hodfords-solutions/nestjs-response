#! /bin/bash

npm view @hodfords/nestjs-response@"$(node -p "require('./package.json').version")" version && echo "Package is already published" && exit 0 || true
npm install
npm run build
cp package.json dist/libs
cp README.md dist
cd dist
npm publish --access public
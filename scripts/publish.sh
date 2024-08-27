#! /bin/bash

npm view @hodfords/nestjs-response@"$(node -p "require('./package.json').version")" version && echo "Package is already published" && exit 0 || true
npm install
npm run build
cp README.md dist/libs
cd dist/libs
npm publish --access public
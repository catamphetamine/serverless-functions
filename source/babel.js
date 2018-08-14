// See the full original at:
// https://github.com/babel/babel/blob/6.x/packages/babel-register/src/node.js

import deepClone from "lodash/cloneDeep";
import sourceMapSupport from "source-map-support";
import extend from "lodash/extend";
import * as babel from "babel-core";
import { util, OptionManager } from "babel-core";
import fs from "fs";
import path from "path";

sourceMapSupport.install({
  handleUncaughtExceptions: false,
  environment : "node",
  retrieveSourceMap(source) {
    const map = maps && maps[source];
    if (map) {
      return {
        url: null,
        map: map
      };
    } else {
      return null;
    }
  }
});

let cache = {};

const transformOpts = {};

let ignore;
let only;

const maps = {};

const cwd = process.cwd();

function getRelativePath(filename) {
  return path.relative(cwd, filename);
}

function mtime(filename) {
  return +fs.statSync(filename).mtime;
}

export default function compile(code, filename) {
  let result;

  // merge in base options and resolve all the plugins and presets relative to this file
  const opts = new OptionManager().init(extend(
    { sourceRoot: path.dirname(filename) }, // sourceRoot can be overwritten
    deepClone(transformOpts),
    { filename }
  ));

  let cacheKey = `${JSON.stringify(opts)}:${babel.version}`;

  const env = process.env.BABEL_ENV || process.env.NODE_ENV;
  if (env) cacheKey += `:${env}`;

  if (cache) {
    const cached = cache[cacheKey];
    if (cached && cached.mtime === mtime(filename)) {
      result = cached;
    }
  }

  if (!result) {
    result = babel.transform(code, extend(opts, {
    	filename,
      // Do not process config files since has already been done with the OptionManager
      // calls above and would introduce duplicates.
      babelrc: false,
      sourceMaps: "both",
      ast: false
    }));
  }

  if (cache) {
    cache[cacheKey] = result;
    result.mtime = mtime(filename);
  }

  maps[filename] = result.map;

  return result.code;
}

export function shouldIgnore(filename) {
  if (!ignore && !only) {
    return getRelativePath(filename).split(path.sep).indexOf("node_modules") >= 0;
  } else {
    return util.shouldIgnore(filename, ignore || [], only);
  }
}
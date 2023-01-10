// See the full original at:
// https://github.com/babel/babel/blob/master/packages/babel-register/src/node.js

import deepClone from "lodash/cloneDeep.js";
import sourceMapSupport from "source-map-support";
import escapeRegExp from "lodash/escapeRegExp.js";
import * as babel from "@babel/core";
import { OptionManager, DEFAULT_EXTENSIONS } from "@babel/core";
import fs from "fs";
import path from "path";

const maps = {};
let transformOpts = {};

function installSourceMapSupport() {
  sourceMapSupport.install({
    handleUncaughtExceptions: false,
    environment: "node",
    retrieveSourceMap(source) {
      const map = maps && maps[source];
      if (map) {
        return {
          url: null,
          map: map,
        };
      } else {
        return null;
      }
    },
  });
}

let cache = {};

function mtime(filename) {
  return +fs.statSync(filename).mtime;
}

export default function compile(code, filename) {
  // merge in base options and resolve all the plugins and presets relative to this file
  const opts = new OptionManager().init(
    {
      sourceRoot: path.dirname(filename),
      ...deepClone(transformOpts),
      //
      // Setting `cwd` to file's directory
      // otherwise Babel wouldn't compile files
      // outside of `process.cwd()`.
      //
      // A srverless function may require some other api in another folder.
      // Example: `webapp-backend` requiring `../webapp-api` in `$initialize`.
      //
      cwd: path.dirname(filename),
      filename,
    },
  );

  // Bail out ASAP if the file has been ignored.
  if (opts === null) return code;

  let cacheKey = `${JSON.stringify(opts)}:${babel.version}`;

  const env = babel.getEnv(false);

  if (env) cacheKey += `:${env}`;

  let cached = cache && cache[cacheKey];

  if (!cached || cached.mtime !== mtime(filename)) {
    cached = babel.transform(code, {
      ...opts,
      sourceMaps: opts.sourceMaps === undefined ? "both" : opts.sourceMaps,
      ast: false,
    });

    if (cache) {
      cache[cacheKey] = cached;
      cached.mtime = mtime(filename);
    }
  }

  if (cached.map) {
    if (Object.keys(maps).length === 0) {
      installSourceMapSupport();
    }
    maps[filename] = cached.map;
  }

  return cached.code;
}

function getTransformOpts(opts) {
  const transformOpts = {
    ...opts,
    caller: {
      name: "@babel/register",
      ...(opts.caller || {}),
    },
  };

  let { cwd = "." } = transformOpts;

  // Ensure that the working directory is resolved up front so that
  // things don't break if it changes later.
  cwd = transformOpts.cwd = path.resolve(cwd);

  if (transformOpts.ignore === undefined && transformOpts.only === undefined) {
    // transformOpts.only = [
    //   // Only compile things inside the current working directory.
    //   new RegExp("^" + escapeRegExp(cwd), "i"),
    // ];
    transformOpts.ignore = [
      // // Ignore any node_modules inside the current working directory.
      // new RegExp(
      //   "^" +
      //     escapeRegExp(cwd) +
      //     "(?:" +
      //     path.sep +
      //     ".*)?" +
      //     escapeRegExp(path.sep + "node_modules" + path.sep),
      //   "i",
      // ),
      // Ignore any node_modules.
      new RegExp(
        escapeRegExp(path.sep + "node_modules" + path.sep),
        "i",
      ),
    ];
  }
  return transformOpts;
}

export function initializeBabelOptions(opts) {
  transformOpts = getTransformOpts(opts);
}
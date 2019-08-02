/**
 * Copyright 2019 American Express Travel Related Services Company, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

const fs = require("fs-extra");
const replace = require("replace");
const path = require("path");

const FABRIC_CLIENT_LEGACY_DEV = path.join(
  __dirname,
  "../node_modules/fabric-client-legacy/config"
);
const FABRIC_CLIENT_LEGACY = path.join(
  __dirname,
  "../../fabric-client-legacy/config"
);
const FABRIC_CA_CLIENT_LEGACY_DEV = path.join(
  __dirname,
  "../node_modules/fabric-ca-client-legacy/config"
);
const FABRIC_CA_CLIENT_LEGACY = path.join(
  __dirname,
  "../../fabric-ca-client-legacy/config"
);

const FABRIC_CLIENT_LEGACY_TYPES = path.join(
  __dirname,
  "../../fabric-client-legacy/types"
);
const FABRIC_CA_CLIENT_LEGACY_TYPES = path.join(
  __dirname,
  "../../fabric-ca-client-legacy/types"
);
const FABRIC_CLIENT_LEGACY_TYPES_DEV = path.join(
  __dirname,
  "../node_modules/fabric-client-legacy/types"
);
const FABRIC_CA_CLIENT_LEGACY_TYPES_DEV = path.join(
  __dirname,
  "../node_modules/fabric-ca-client-legacy/types"
);
const FABRIC_CLIENT_PATH = [];
const FABRIC_CA_CLIENT_PATH = [];
const FABRIC_CLIENT_TYPES = [];

if (fs.existsSync(FABRIC_CLIENT_LEGACY_DEV)) {
  FABRIC_CLIENT_PATH.push(FABRIC_CLIENT_LEGACY_DEV);
}
if (fs.existsSync(FABRIC_CLIENT_LEGACY)) {
  FABRIC_CLIENT_PATH.push(FABRIC_CLIENT_LEGACY);
}
if (fs.existsSync(FABRIC_CA_CLIENT_LEGACY_DEV)) {
  FABRIC_CA_CLIENT_PATH.push(FABRIC_CA_CLIENT_LEGACY_DEV);
}
if (fs.existsSync(FABRIC_CA_CLIENT_LEGACY)) {
  FABRIC_CA_CLIENT_PATH.push(FABRIC_CA_CLIENT_LEGACY);
}
if (fs.existsSync(FABRIC_CLIENT_LEGACY_TYPES)) {
  FABRIC_CLIENT_TYPES.push(FABRIC_CLIENT_LEGACY_TYPES);
}
if (fs.existsSync(FABRIC_CA_CLIENT_LEGACY_TYPES)) {
  FABRIC_CLIENT_TYPES.push(FABRIC_CA_CLIENT_LEGACY_TYPES);
}
if (fs.existsSync(FABRIC_CLIENT_LEGACY_TYPES_DEV)) {
  FABRIC_CLIENT_TYPES.push(FABRIC_CLIENT_LEGACY_TYPES_DEV);
}
if (fs.existsSync(FABRIC_CA_CLIENT_LEGACY_TYPES_DEV)) {
  FABRIC_CLIENT_TYPES.push(FABRIC_CA_CLIENT_LEGACY_TYPES_DEV);
}
replace({
  regex: "fabric-client/lib",
  replacement: "fabric-client-legacy/lib",
  paths: FABRIC_CLIENT_PATH,
  recursive: true,
  silent: true
});
replace({
  regex: "fabric-ca-client/lib",
  replacement: "fabric-ca-client-legacy/lib",
  paths: FABRIC_CA_CLIENT_PATH,
  recursive: true,
  silent: true
});
replace({
  regex: "fabric-ca-client",
  replacement: "fabric-ca-client-legacy",
  paths: FABRIC_CLIENT_PATH,
  recursive: true,
  silent: true
});
replace({
  regex: "fabric-client",
  replacement: "fabric-client-legacy",
  paths: FABRIC_CLIENT_TYPES,
  recursive: true,
  silent: true
});
replace({
  regex: "fabric-ca-client",
  replacement: "fabric-ca-client-legacy",
  paths: FABRIC_CLIENT_TYPES,
  recursive: true,
  silent: true
});

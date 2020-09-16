
const cmd: string = (Deno.args[0]||"").toLowerCase();
const addCmdProvider: string = (Deno.args[1]||"").toLowerCase();
const addCmdUser: string = (Deno.args[2]||"").toLowerCase();
const addCmdRepo: string = (Deno.args[3]||"").toLowerCase();

const textdec = new TextDecoder();
const textenc = new TextEncoder();

function help() {
  console.log(
    "help - shows this message\n",
    "list - shows backups\n",
    "install - iterates backups.json and installs new entries\n",
    ""
  );
}

function getNotInstalledUrls (backupJson: BackupJson): string[] {
  let result: string[] = new Array();

  let installed = getInstalledUrls();
  let tracked = getTrackedUrls(backupJson);
  for (let url of tracked) {
    if (!installed.includes(url)) {
      result.push(url);
    }
  }
  return result;
}

function getTrackedUrls (backupJson: BackupJson): string [] {
  let result: string[] = new Array();
  for (let providerId in backupJson.archives) {
    let provider = backupJson.archives[providerId];
    for (let userId in provider) {
      let user = provider[userId];
      for (let repoId of user) {
        result.push(`${providerId}@${userId}/${repoId}`);
      }
    }
  }
  return result;
}

function getInstalledUrls (): string[] {
  let result: string[] = new Array();
  for (let providerEntry of Deno.readDirSync("./backups")) {
    if (providerEntry.isDirectory) {
      for (let userEntry of Deno.readDirSync(`./backups/${providerEntry.name}`)) {
        if (userEntry.isDirectory) {
          for (let repoEntry of Deno.readDirSync(`./backups/${providerEntry.name}/${userEntry.name}`)) {
            if (repoEntry.isFile) {
              let fname: string = repoEntry.name;
              let ind = fname.indexOf(".");
              if (ind > 0) {
                fname = fname.substring(0, ind);
              }
              result.push(`${providerEntry.name}@${userEntry.name}/${fname}`);
            }
          }
        }
      }
    }
  }
  return result;
}

function list() {
  let installed = getInstalledUrls();
  console.log(installed.length, "packages are installed");
  console.log("[", ...getInstalledUrls(), "]\n");

  let notInstalled = getNotInstalledUrls(bkjson);
  if (notInstalled.length > 0) {
    console.log(notInstalled.length, "packages not installed, but are tracked:");
    console.log("[", ...notInstalled, "]");
    console.log("run `gitbak install` to add them");
  } else {
    console.log("all tracked files are installed");
  }
}

function installPackageGithub (userId: string, repoId: string) {
  fetch(`https://github.com/${userId}/${repoId}/archive/master.zip`).then((resp)=>{
    resp.arrayBuffer().then((buff)=>{
      const data = new Uint8Array(buff);

      console.log("downloaded", userId, repoId, ", saving to gitbak/backups/github");
      
      let fpath = `./backups/github/${userId}`;
      Deno.mkdirSync(fpath, { recursive: true });

      let fname = `${fpath}/${repoId}.zip`;

      Deno.writeFileSync(fname, data, {create: true});
      console.log("finished writing");
    });
  });
}

function installPackage (pkgname: string) {
  let ind = pkgname.indexOf("@");
  if (ind < 1) throw `cannot install package of provider in ${pkgname}`;
  let providerId = pkgname.substring(0, ind).toLowerCase();

  let [userId, repoId] = pkgname.substring(ind+1).split("/");

  switch (providerId) {
    case "github":
      installPackageGithub(userId, repoId);
      break;
    default:
      throw `I don't know how to handle provider ${providerId} when installing ${pkgname}`;
      break;
  }
  console.log("fetching", userId, repoId, "from", providerId);
}

function install() {
  let notInstalled = getNotInstalledUrls(bkjson);
  if (notInstalled.length > 0) {
    console.log("installing", notInstalled.length, "tracked packages");
    for (let pkgname of notInstalled) {
      installPackage(pkgname);
    }
  } else {
    console.log("no tracked packages need installed, maybe you meant `gitbak update` ?");
  }
}

function add (providerId: string, userId: string, repoId: string) {
  updateBackupJson();
  if (!bkjson.archives[providerId]) {
    bkjson.archives[providerId] = {
      userId:[repoId]
    };
  } else {
    if (!bkjson.archives[providerId][userId]) {
      bkjson.archives[providerId][userId] = [];
    }
    if (bkjson.archives[providerId][userId].includes(repoId)) {
      throw `${providerId}@${userId}/${repoId} is already included`;
    }
    bkjson.archives[providerId][userId].push(repoId);
  }
  saveBackupJson();
}

function remove (providerId: string, userId: string, repoId: string) {
  updateBackupJson();
  if (!bkjson.archives[providerId]) {
    throw `no provider exists for ${providerId}, no need to remove sub user/repo`;
  } else {
    if (!bkjson.archives[providerId][userId]) {
      throw `no user found in provider ${providerId} for ${userId}, no need to remove sub user/repo`;
    }
    if (!bkjson.archives[providerId][userId].includes(repoId)) {
      throw `${repoId} not added, no need to remove sub user/repo`;
    }
    let ind: number = bkjson.archives[providerId][userId].indexOf(repoId);
    bkjson.archives[providerId][userId].splice(ind, 1);
  }
  saveBackupJson();
}

declare interface BackupJsonUser extends Array<string> { };
declare interface BackupJsonProvider {
  [key: string]: BackupJsonUser;
  [Symbol.iterator](): Iterator<string>;
}
declare interface BackupJsonArchives {
  [key: string]: BackupJsonProvider;
  [Symbol.iterator](): Iterator<string>;
}
declare interface BackupJson {
  archives: BackupJsonArchives;
}

let bkjson: any;

function updateBackupJson () {
  bkjson = JSON.parse(
    textdec.decode(
      Deno.readFileSync(
        "./backups.json"
      )
    )
  );
}

function saveBackupJson () {
  let str = JSON.stringify(bkjson, undefined, 2);
  let buff = textenc.encode(str);
  Deno.writeFileSync("./backups.json", buff, {create: true});
}

function init() {
  updateBackupJson();

  switch (cmd) {
    case "help":
      help();
      break;
    case "list":
      list();
      break;
    case "install":
      install();
      break;
    case "add":
      if (addCmdProvider == "") throw "no provider";
      if (addCmdUser == "") throw "no user";
      if (addCmdRepo == "") throw "no repo";
      add(addCmdProvider, addCmdUser, addCmdRepo);
      break;
    case "remove":
      if (addCmdProvider == "") throw "no provider";
      if (addCmdUser == "") throw "no user";
      if (addCmdRepo == "") throw "no repo";
      remove(addCmdProvider, addCmdUser, addCmdRepo);
      break;
    default:
      console.log(`command "${cmd}" is not handled`);
      break;
  }
}

init();

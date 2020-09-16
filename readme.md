
You need `deno` to run this code

See `./gitbak help` for a list of commands

## Commands
- `help` - unfinished, shows a command list
- `add <provider> <user> <repo>` - tracks a repo
- `remove <provider> <user> <repo>` - stops tracking a repo
- `install` installs tracked repos that aren't installed
- `update` - unfinished, grabs more recent version (if applicable) of all repos and overwrites them
- `list` - unfinished, lists information about tracked, installed, and installed-untracked repos
- `purge` - unfinished, erases untracked-installed repos that were previously `remove`d

## Provider
Right now the only functional one is `github`
The plan is to make this a little more reusable with an extension json

## User
The user name/org a repository is under
## Repo
A source code/text to be stored 

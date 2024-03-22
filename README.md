# Workspace Portal
This is a tool for automagically symlinking specific directories across different npm packages or workspaces during development.

## How?
When multiple portals run on the same computer at the same time, they will detect each others package information and create symlinks for the specified directories.

## Setup
```bash
npm i -D @mxjp/workspace-portal
```

To start a portal run:
```bash
npx workspace-portal [...dirs]

# Example: When writing build output into "./dist":
npx workspace-portal dist
```

You can also add this to a script you usually run during development:
```js
{
  "scripts": {
    "start": "concurrently \"workspace-portal dist ...\" ..."
  }
}
```

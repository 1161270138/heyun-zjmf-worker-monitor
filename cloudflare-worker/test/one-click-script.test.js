import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const localScriptDir = path.join(repoRoot, 'windows-one-click-deploy');

function readUtf8(relativePath) {
  return readFileSync(path.join(localScriptDir, relativePath), 'utf8');
}

test('步骤1脚本写明 GitHub 仓库地址并复用为下载源', () => {
  const wrapper = readUtf8('步骤1-一键安装脚本.bat');
  const installer = readUtf8('步骤1-一键安装.bat');

  assert.match(wrapper, /GitHub 仓库地址|UPSTREAM_REPO/);
  assert.match(wrapper, /REAL_FILE=%CD%\\步骤1-一键安装\.bat/);
  assert.doesNotMatch(wrapper, /REAL_FILE=%CD%\\step1-install\.bat/);
  assert.match(installer, /GitHub 仓库地址|UPSTREAM_REPO/);
  assert.match(installer, /raw\.githubusercontent\.com/);
});

test('文档里的步骤1下载入口使用 Release 附件链接', () => {
  const rootReadme = readFileSync(path.join(repoRoot, 'README.md'), 'utf8');
  const workerReadme = readFileSync(path.join(repoRoot, 'cloudflare-worker', 'README.md'), 'utf8');
  const usage = readUtf8('使用说明.txt');
  const releaseUrl = /https:\/\/github\.com\/loqwe\/heyun-zjmf-worker-monitor\/releases\/download\/release-step1-bat-v1\/step1-install\.bat/;

  assert.match(rootReadme, releaseUrl);
  assert.match(workerReadme, releaseUrl);
  assert.match(usage, releaseUrl);
  assert.match(rootReadme, /Release 页面显示名仍是 `步骤1-一键安装脚本\.bat`/);
  assert.doesNotMatch(rootReadme, /raw\/main\/windows-one-click-deploy\/步骤1-一键安装脚本\.bat/);
  assert.doesNotMatch(workerReadme, /raw\/main\/windows-one-click-deploy\/步骤1-一键安装脚本\.bat/);
});

test('Release workflow 会发布中文名步骤1安装脚本附件', () => {
  const workflow = readFileSync(path.join(repoRoot, '.github', 'workflows', 'release-step1-bat.yml'), 'utf8');

  assert.match(workflow, /release-step1-bat-v1/);
  assert.match(workflow, /ASSET_NAME: step1-install\.bat/);
  assert.match(workflow, /ASSET_LABEL: 步骤1-一键安装脚本\.bat/);
  assert.match(workflow, /ASSET_PATH: windows-one-click-deploy\/步骤1-一键安装\.bat/);
  assert.match(workflow, /actions\/github-script@v7/);
  assert.match(workflow, /uploadReleaseAsset/);
  assert.match(workflow, /deleteReleaseAsset/);
});
